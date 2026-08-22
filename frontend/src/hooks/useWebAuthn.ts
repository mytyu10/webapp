import { useState } from 'react';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import {
  startWebAuthnRegistration,
  finishWebAuthnRegistration,
  startWebAuthnAuthentication,
  finishWebAuthnAuthentication,
} from '../api/accountApi';
import { logger } from '../logger';

const CONTEXT = 'useWebAuthn';

interface UseWebAuthnReturn {
  /** 顔認証登録フロー */
  registerWebAuthn: (username: string) => Promise<void>;
  /** 顔認証認証フロー。成功時はJWTをlocalStorageに保存する */
  authenticateWithWebAuthn: (username: string) => Promise<void>;
  loading: boolean;
  error: string;
  clearError: () => void;
}

export function useWebAuthn(): UseWebAuthnReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * 顔認証登録フロー
   * 1. サーバーから登録オプションを取得
   * 2. ブラウザのWebAuthn APIを呼び出し（カメラ・生体認証）
   * 3. 結果をサーバーに送信して検証・保存
   */
  async function registerWebAuthn(username: string): Promise<void> {
    setLoading(true);
    setError('');
    logger.info(CONTEXT, `顔認証登録開始: ${username}`);

    try {
      // 1. サーバーから登録オプションを取得
      const options = await startWebAuthnRegistration(username);

      // 2. ブラウザのWebAuthn APIを呼び出す（ユーザーが生体認証を実施）
      const registrationResponse = await startRegistration(options);

      // 3. サーバーへ送信して検証・クレデンシャル保存
      await finishWebAuthnRegistration(username, registrationResponse);

      logger.info(CONTEXT, `顔認証登録完了: ${username}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '顔認証の登録に失敗しました。';
      logger.warn(CONTEXT, `顔認証登録エラー: ${username} - ${message}`);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  /**
   * 顔認証認証フロー
   * 1. サーバーから認証オプションを取得
   * 2. ブラウザのWebAuthn APIを呼び出し（カメラ・生体認証）
   * 3. 結果をサーバーに送信して検証・JWT取得
   * 4. JWTをlocalStorageに保存
   */
  async function authenticateWithWebAuthn(username: string): Promise<void> {
    setLoading(true);
    setError('');
    logger.info(CONTEXT, `顔認証認証開始: ${username}`);

    try {
      // 1. サーバーから認証オプションを取得
      const options = await startWebAuthnAuthentication(username);

      // 2. ブラウザのWebAuthn APIを呼び出す（ユーザーが生体認証を実施）
      const authenticationResponse = await startAuthentication(options);

      // 3. サーバーへ送信して検証・JWT取得
      const token = await finishWebAuthnAuthentication(username, authenticationResponse);

      // 4. JWTをlocalStorageに保存
      localStorage.setItem('token', token);

      logger.info(CONTEXT, `顔認証認証完了: ${username}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '顔認証による認証に失敗しました。';
      logger.warn(CONTEXT, `顔認証認証エラー: ${username} - ${message}`);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function clearError() {
    setError('');
  }

  return { registerWebAuthn, authenticateWithWebAuthn, loading, error, clearError };
}
