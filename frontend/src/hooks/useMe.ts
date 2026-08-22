import { useState, useEffect } from 'react';
import { fetchMe, type AccountMe } from '../api/accountApi';
import { logger } from '../logger';

const CONTEXT = 'useMe';

interface UseMeResult {
  me: AccountMe | null;
  loading: boolean;
  error: string | null;
}

/**
 * ログインユーザー情報を取得するカスタムフック
 * マウント時に GET /accounts/me を呼び出し username と display_name を返す
 */
export function useMe(): UseMeResult {
  const [me, setMe] = useState<AccountMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchMe();
        if (!cancelled) {
          setMe(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'ユーザー情報の取得に失敗しました。';
          logger.warn(CONTEXT, `ユーザー情報取得失敗: ${message}`);
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { me, loading, error };
}
