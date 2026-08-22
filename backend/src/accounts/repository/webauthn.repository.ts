import { Injectable } from '@nestjs/common';
import type { WebAuthnCredential, WebAuthnChallenge } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WebAuthnRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * チャレンジを保存する（既存チャレンジは上書き：同一ユーザー・同一typeは削除後に作成）
   */
  async saveChallenge(
    username: string,
    challenge: string,
    type: 'registration' | 'authentication',
    expiresAt: Date,
  ): Promise<WebAuthnChallenge> {
    // 同一ユーザー・同一typeの古いチャレンジを削除してから新規作成
    await this.prisma.webAuthnChallenge.deleteMany({
      where: { username, type },
    });
    return this.prisma.webAuthnChallenge.create({
      data: { username, challenge, type, expires_at: expiresAt },
    });
  }

  /**
   * ユーザーと種別でチャレンジを取得する
   */
  async findChallenge(
    username: string,
    type: 'registration' | 'authentication',
  ): Promise<WebAuthnChallenge | null> {
    return this.prisma.webAuthnChallenge.findFirst({
      where: { username, type },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * チャレンジをIDで削除する（使用済み処理）
   */
  async deleteChallenge(id: string): Promise<void> {
    await this.prisma.webAuthnChallenge.delete({ where: { id } });
  }

  /**
   * WebAuthnクレデンシャルを保存する
   * @param data.public_key - Prismaの Bytes フィールドに保存する公開鍵。
   *   Uint8Array<ArrayBufferLike> → Uint8Array<ArrayBuffer> への変換を行う
   */
  async saveCredential(data: {
    id: string;
    username: string;
    public_key: Uint8Array;
    counter: number;
    device_type: string;
    backed_up: boolean;
    transports?: string;
  }): Promise<WebAuthnCredential> {
    // Prisma の Bytes 型は Uint8Array<ArrayBuffer> を要求するため
    // SharedArrayBuffer を含む可能性のある ArrayBufferLike から確実な ArrayBuffer にコピーする
    const publicKeyBuffer = new Uint8Array(
      data.public_key.buffer.slice(
        data.public_key.byteOffset,
        data.public_key.byteOffset + data.public_key.byteLength,
      ),
    );
    return this.prisma.webAuthnCredential.create({
      data: {
        id: data.id,
        username: data.username,
        public_key: publicKeyBuffer as unknown as Uint8Array<ArrayBuffer>,
        counter: data.counter,
        device_type: data.device_type,
        backed_up: data.backed_up,
        transports: data.transports,
      },
    });
  }

  /**
   * ユーザーのクレデンシャル一覧を取得する
   */
  async findCredentialsByUsername(
    username: string,
  ): Promise<WebAuthnCredential[]> {
    return this.prisma.webAuthnCredential.findMany({
      where: { username },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * クレデンシャルIDでクレデンシャルを取得する
   */
  async findCredentialById(id: string): Promise<WebAuthnCredential | null> {
    return this.prisma.webAuthnCredential.findUnique({ where: { id } });
  }

  /**
   * クレデンシャルのカウンターを更新する（リプレイアタック防止）
   */
  async updateCredentialCounter(
    id: string,
    counter: number,
  ): Promise<WebAuthnCredential> {
    return this.prisma.webAuthnCredential.update({
      where: { id },
      data: { counter },
    });
  }
}
