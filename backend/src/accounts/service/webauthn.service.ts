import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';
import { WebAuthnRepository } from '../repository/webauthn.repository';
import { AccountRepository } from '../repository/account.repository';
import { JwtService } from 'src/jwt/jwt.service';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

/** チャレンジTTL（5分）*/
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const CONTEXT = 'WebAuthnService';

/** JSON文字列として保存したtransports配列を解析する */
function parseTransports(
  transports: string | null,
): AuthenticatorTransportFuture[] | undefined {
  if (!transports) return undefined;
  return JSON.parse(transports) as AuthenticatorTransportFuture[];
}

@Injectable()
export class WebAuthnService {
  private readonly rpID: string;
  private readonly rpName: string;
  private readonly origin: string;

  constructor(
    private readonly webAuthnRepository: WebAuthnRepository,
    private readonly accountRepository: AccountRepository,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {
    this.rpID = process.env.WEBAUTHN_RP_ID ?? 'localhost';
    this.rpName = process.env.WEBAUTHN_RP_NAME ?? 'webapp';
    this.origin = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  }

  /**
   * 顔認証登録開始：チャレンジを生成してフロントエンドに返す
   */
  async startRegistration(username: string) {
    this.logger.log(CONTEXT, `登録開始: ${username}`);

    const account = await this.accountRepository.getAccount(username);
    if (!account) {
      throw new NotFoundException(MESSAGE.AUTH.NOT_FOUND);
    }

    // 既存クレデンシャルを除外リストに設定（同じ認証器を重複登録させない）
    const existingCredentials =
      await this.webAuthnRepository.findCredentialsByUsername(username);

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: username,
      userName: username,
      userDisplayName: username,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((cred) => ({
        id: Buffer.from(cred.id, 'base64url'),
        type: 'public-key' as const,
        transports: parseTransports(cred.transports),
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
    await this.webAuthnRepository.saveChallenge(
      username,
      options.challenge,
      'registration',
      expiresAt,
    );

    this.logger.log(CONTEXT, `登録オプション生成完了: ${username}`);
    return options;
  }

  /**
   * 顔認証登録完了：ブラウザのレスポンスを検証してクレデンシャルを保存する
   */
  async finishRegistration(
    username: string,
    response: RegistrationResponseJSON,
  ) {
    this.logger.log(CONTEXT, `登録完了処理: ${username}`);

    const challengeRecord = await this.webAuthnRepository.findChallenge(
      username,
      'registration',
    );
    if (!challengeRecord) {
      throw new UnauthorizedException(MESSAGE.WEBAUTHN.CHALLENGE_NOT_FOUND);
    }

    // チャレンジ有効期限チェック
    if (new Date() > challengeRecord.expires_at) {
      await this.webAuthnRepository.deleteChallenge(challengeRecord.id);
      throw new UnauthorizedException(MESSAGE.WEBAUTHN.CHALLENGE_EXPIRED);
    }

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: false,
      });
    } catch (error) {
      this.logger.warn(
        CONTEXT,
        `登録検証エラー: ${username} - ${String(error)}`,
      );
      throw new UnauthorizedException(MESSAGE.WEBAUTHN.REGISTRATION_FAILED);
    }

    // 使用済みチャレンジを削除
    await this.webAuthnRepository.deleteChallenge(challengeRecord.id);

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException(MESSAGE.WEBAUTHN.REGISTRATION_FAILED);
    }

    const {
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp,
    } = verification.registrationInfo;

    // Uint8Array → base64url 文字列に変換してIDとして保存
    const credentialIdBase64 = Buffer.from(credentialID).toString('base64url');

    // 既存クレデンシャルIDと重複チェック
    const existing =
      await this.webAuthnRepository.findCredentialById(credentialIdBase64);
    if (existing) {
      throw new BadRequestException(MESSAGE.WEBAUTHN.CREDENTIAL_ALREADY_EXISTS);
    }

    await this.webAuthnRepository.saveCredential({
      id: credentialIdBase64,
      username,
      // credentialPublicKey は Uint8Array なのでそのまま渡す
      public_key: credentialPublicKey,
      counter,
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      transports: response.response?.transports
        ? JSON.stringify(response.response.transports)
        : undefined,
    });

    this.logger.log(CONTEXT, `登録完了: ${username}`);
    return { verified: true };
  }

  /**
   * 顔認証開始：チャレンジを生成してフロントエンドに返す
   */
  async startAuthentication(username: string) {
    this.logger.log(CONTEXT, `認証開始: ${username}`);

    const credentials =
      await this.webAuthnRepository.findCredentialsByUsername(username);
    if (credentials.length === 0) {
      throw new NotFoundException(MESSAGE.WEBAUTHN.NO_CREDENTIALS);
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: credentials.map((cred) => ({
        id: Buffer.from(cred.id, 'base64url'),
        type: 'public-key' as const,
        transports: parseTransports(cred.transports),
      })),
    });

    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
    await this.webAuthnRepository.saveChallenge(
      username,
      options.challenge,
      'authentication',
      expiresAt,
    );

    this.logger.log(CONTEXT, `認証オプション生成完了: ${username}`);
    return options;
  }

  /**
   * 顔認証完了：ブラウザのレスポンスを検証してJWTを発行する
   */
  async finishAuthentication(
    username: string,
    response: AuthenticationResponseJSON,
  ): Promise<string> {
    this.logger.log(CONTEXT, `認証完了処理: ${username}`);

    const challengeRecord = await this.webAuthnRepository.findChallenge(
      username,
      'authentication',
    );
    if (!challengeRecord) {
      throw new UnauthorizedException(MESSAGE.WEBAUTHN.CHALLENGE_NOT_FOUND);
    }

    // チャレンジ有効期限チェック
    if (new Date() > challengeRecord.expires_at) {
      await this.webAuthnRepository.deleteChallenge(challengeRecord.id);
      throw new UnauthorizedException(MESSAGE.WEBAUTHN.CHALLENGE_EXPIRED);
    }

    // レスポンスの credentialId から対象クレデンシャルを取得
    const credentialId = response.id;
    const credential =
      await this.webAuthnRepository.findCredentialById(credentialId);

    if (!credential || credential.username !== username) {
      await this.webAuthnRepository.deleteChallenge(challengeRecord.id);
      throw new UnauthorizedException(MESSAGE.WEBAUTHN.AUTHENTICATION_FAILED);
    }

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        authenticator: {
          credentialID: Buffer.from(credential.id, 'base64url'),
          // DB から取得した Bytes フィールドは Buffer なので Uint8Array に変換する
          credentialPublicKey: new Uint8Array(credential.public_key as Buffer),
          counter: credential.counter,
          transports: parseTransports(credential.transports),
        },
        requireUserVerification: false,
      });
    } catch (error) {
      this.logger.warn(
        CONTEXT,
        `認証検証エラー: ${username} - ${String(error)}`,
      );
      await this.webAuthnRepository.deleteChallenge(challengeRecord.id);
      throw new UnauthorizedException(MESSAGE.WEBAUTHN.AUTHENTICATION_FAILED);
    }

    // 使用済みチャレンジを削除
    await this.webAuthnRepository.deleteChallenge(challengeRecord.id);

    if (!verification.verified) {
      throw new UnauthorizedException(MESSAGE.WEBAUTHN.AUTHENTICATION_FAILED);
    }

    // カウンターを更新（リプレイアタック防止）
    await this.webAuthnRepository.updateCredentialCounter(
      credentialId,
      verification.authenticationInfo.newCounter,
    );

    this.logger.log(CONTEXT, `認証成功: ${username}`);
    return this.jwtService.createToken({ username });
  }
}
