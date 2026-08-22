import { useState, useEffect, useCallback } from 'react';
import { fetchMe, type AccountMe } from '../api/accountApi';
import { logger } from '../logger';

const CONTEXT = 'useMe';

interface UseMeResult {
  me: AccountMe | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * ログインユーザー情報を取得するカスタムフック
 * マウント時に GET /accounts/me を呼び出し username と display_name を返す
 * refetch() を呼び出すことで最新情報を再取得できる
 */
export function useMe(): UseMeResult {
  const [me, setMe] = useState<AccountMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMe();
      setMe(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ユーザー情報の取得に失敗しました。';
      logger.warn(CONTEXT, `ユーザー情報取得失敗: ${message}`);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { me, loading, error, refetch: load };
}
