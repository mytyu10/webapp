import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { WebAuthnService } from './webauthn.service';
import { WebAuthnRepository } from '../repository/webauthn.repository';
import { AccountRepository } from '../repository/account.repository';
import { JwtService } from 'src/jwt/jwt.service';
import { LoggerService } from 'src/common/service/logger.service';

// @simplewebauthn/server のモック
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn().mockResolvedValue({
    challenge: 'test-challenge',
    rp: { name: 'webapp', id: 'localhost' },
    user: { id: 'alice', name: 'alice', displayName: 'alice' },
    pubKeyCredParams: [],
    timeout: 60000,
    attestation: 'none',
    excludeCredentials: [],
    authenticatorSelection: {},
  }),
  generateAuthenticationOptions: jest.fn().mockResolvedValue({
    challenge: 'test-auth-challenge',
    timeout: 60000,
    rpId: 'localhost',
    allowCredentials: [],
    userVerification: 'preferred',
  }),
  verifyRegistrationResponse: jest.fn().mockResolvedValue({
    verified: true,
    registrationInfo: {
      credentialID: new Uint8Array([1, 2, 3, 4]),
      credentialPublicKey: new Uint8Array([5, 6, 7, 8]),
      counter: 0,
      credentialDeviceType: 'singleDevice',
      credentialBackedUp: false,
    },
  }),
  verifyAuthenticationResponse: jest.fn().mockResolvedValue({
    verified: true,
    authenticationInfo: {
      newCounter: 1,
    },
  }),
}));

const mockWebAuthnRepository = {
  saveChallenge: jest.fn(),
  findChallenge: jest.fn(),
  deleteChallenge: jest.fn(),
  saveCredential: jest.fn(),
  findCredentialsByUsername: jest.fn(),
  findCredentialById: jest.fn(),
  updateCredentialCounter: jest.fn(),
};

const mockAccountRepository = {
  getAccount: jest.fn(),
};

const mockJwtService = {
  createToken: jest.fn().mockReturnValue('mock-jwt-token'),
};

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('WebAuthnService', () => {
  let service: WebAuthnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebAuthnService,
        { provide: WebAuthnRepository, useValue: mockWebAuthnRepository },
        { provide: AccountRepository, useValue: mockAccountRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<WebAuthnService>(WebAuthnService);
    jest.clearAllMocks();
  });

  describe('startRegistration', () => {
    it('アカウントが存在する場合は登録オプションを返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue({
        username: 'alice',
        hashed_password: 'hash',
      });
      mockWebAuthnRepository.findCredentialsByUsername.mockResolvedValue([]);
      mockWebAuthnRepository.saveChallenge.mockResolvedValue({});

      const options = await service.startRegistration('alice');

      expect(options).toBeDefined();
      expect(options.challenge).toBe('test-challenge');
      expect(mockWebAuthnRepository.saveChallenge).toHaveBeenCalledWith(
        'alice',
        'test-challenge',
        'registration',
        expect.any(Date),
      );
    });

    it('アカウントが存在しない場合はNotFoundExceptionをスローする', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(null);

      await expect(service.startRegistration('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('finishRegistration', () => {
    const mockResponse = {
      id: 'AQIDBA',
      rawId: 'AQIDBA',
      response: {
        clientDataJSON: 'test',
        attestationObject: 'test',
        transports: ['internal'],
      },
      type: 'public-key' as const,
      clientExtensionResults: {},
    };

    it('検証が成功するとクレデンシャルを保存して verified: true を返す', async () => {
      const futureDate = new Date(Date.now() + 60000);
      mockWebAuthnRepository.findChallenge.mockResolvedValue({
        id: 'challenge-id',
        challenge: 'test-challenge',
        expires_at: futureDate,
      });
      mockWebAuthnRepository.deleteChallenge.mockResolvedValue({});
      mockWebAuthnRepository.findCredentialById.mockResolvedValue(null);
      mockWebAuthnRepository.saveCredential.mockResolvedValue({});

      const result = await service.finishRegistration(
        'alice',
        mockResponse as any,
      );

      expect(result).toEqual({ verified: true });
      expect(mockWebAuthnRepository.saveCredential).toHaveBeenCalled();
    });

    it('チャレンジが見つからない場合はUnauthorizedExceptionをスローする', async () => {
      mockWebAuthnRepository.findChallenge.mockResolvedValue(null);

      await expect(
        service.finishRegistration('alice', mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('チャレンジが有効期限切れの場合はUnauthorizedExceptionをスローする', async () => {
      const pastDate = new Date(Date.now() - 60000);
      mockWebAuthnRepository.findChallenge.mockResolvedValue({
        id: 'challenge-id',
        challenge: 'test-challenge',
        expires_at: pastDate,
      });
      mockWebAuthnRepository.deleteChallenge.mockResolvedValue({});

      await expect(
        service.finishRegistration('alice', mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('クレデンシャルが既に存在する場合はBadRequestExceptionをスローする', async () => {
      const futureDate = new Date(Date.now() + 60000);
      mockWebAuthnRepository.findChallenge.mockResolvedValue({
        id: 'challenge-id',
        challenge: 'test-challenge',
        expires_at: futureDate,
      });
      mockWebAuthnRepository.deleteChallenge.mockResolvedValue({});
      mockWebAuthnRepository.findCredentialById.mockResolvedValue({
        id: 'AQIDBA',
        username: 'alice',
      });

      await expect(
        service.finishRegistration('alice', mockResponse as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('startAuthentication', () => {
    it('クレデンシャルが存在する場合は認証オプションを返す', async () => {
      mockWebAuthnRepository.findCredentialsByUsername.mockResolvedValue([
        {
          id: 'AQIDBA',
          username: 'alice',
          public_key: Buffer.from([5, 6, 7, 8]),
          counter: 0,
          device_type: 'singleDevice',
          backed_up: false,
          transports: null,
          created_at: new Date(),
        },
      ]);
      mockWebAuthnRepository.saveChallenge.mockResolvedValue({});

      const options = await service.startAuthentication('alice');

      expect(options).toBeDefined();
      expect(options.challenge).toBe('test-auth-challenge');
    });

    it('クレデンシャルが存在しない場合はNotFoundExceptionをスローする', async () => {
      mockWebAuthnRepository.findCredentialsByUsername.mockResolvedValue([]);

      await expect(service.startAuthentication('alice')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('finishAuthentication', () => {
    const mockAuthResponse = {
      id: 'AQIDBA',
      rawId: 'AQIDBA',
      response: {
        clientDataJSON: 'test',
        authenticatorData: 'test',
        signature: 'test',
      },
      type: 'public-key' as const,
      clientExtensionResults: {},
    };

    it('検証が成功するとJWTトークンを返す', async () => {
      const futureDate = new Date(Date.now() + 60000);
      mockWebAuthnRepository.findChallenge.mockResolvedValue({
        id: 'challenge-id',
        challenge: 'test-auth-challenge',
        expires_at: futureDate,
      });
      mockWebAuthnRepository.findCredentialById.mockResolvedValue({
        id: 'AQIDBA',
        username: 'alice',
        public_key: Buffer.from([5, 6, 7, 8]),
        counter: 0,
        transports: null,
      });
      mockWebAuthnRepository.deleteChallenge.mockResolvedValue({});
      mockWebAuthnRepository.updateCredentialCounter.mockResolvedValue({});

      const token = await service.finishAuthentication(
        'alice',
        mockAuthResponse as any,
      );

      expect(token).toBe('mock-jwt-token');
      expect(
        mockWebAuthnRepository.updateCredentialCounter,
      ).toHaveBeenCalledWith('AQIDBA', 1);
    });

    it('チャレンジが見つからない場合はUnauthorizedExceptionをスローする', async () => {
      mockWebAuthnRepository.findChallenge.mockResolvedValue(null);

      await expect(
        service.finishAuthentication('alice', mockAuthResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('クレデンシャルのusernameが一致しない場合はUnauthorizedExceptionをスローする', async () => {
      const futureDate = new Date(Date.now() + 60000);
      mockWebAuthnRepository.findChallenge.mockResolvedValue({
        id: 'challenge-id',
        challenge: 'test-auth-challenge',
        expires_at: futureDate,
      });
      mockWebAuthnRepository.findCredentialById.mockResolvedValue({
        id: 'AQIDBA',
        username: 'other-user', // 別ユーザーのクレデンシャル
        public_key: Buffer.from([5, 6, 7, 8]),
        counter: 0,
        transports: null,
      });
      mockWebAuthnRepository.deleteChallenge.mockResolvedValue({});

      await expect(
        service.finishAuthentication('alice', mockAuthResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
