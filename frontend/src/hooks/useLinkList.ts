import { useState, useEffect, useCallback } from 'react';
import { fetchLinks, deleteLink, LinkItem } from '../api/linkApi';
import { logger } from '../logger';

const CONTEXT = 'useLinkList';

/** useLinkList フックの戻り値型 */
interface UseLinkListReturn {
  /** ツリー構造のリンク/フォルダ一覧 */
  links: LinkItem[];
  loading: boolean;
  error: string;
  /** 展開済みフォルダIDの集合 */
  expandedIds: Set<number>;
  /** フォルダの展開/折りたたみを切り替える */
  toggleExpand: (id: number) => void;
  /** リンク/フォルダを削除する */
  handleDelete: (id: number) => Promise<void>;
  /** 一覧を再取得する */
  reload: () => void;
}

/**
 * リンク集一覧・フォルダ展開/折りたたみ・削除を管理するカスタムフック
 */
export function useLinkList(): UseLinkListReturn {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [reloadTrigger, setReloadTrigger] = useState(0);

  /**
   * 一覧を再取得するトリガーをインクリメントする
   */
  const reload = useCallback((): void => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadData(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        logger.info(CONTEXT, 'リンク一覧読み込み開始');
        const data = await fetchLinks();
        if (!cancelled) {
          setLinks(data);
          logger.info(CONTEXT, `リンク一覧読み込み完了: ${data.length}件`);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'リンクの取得に失敗しました。';
          logger.warn(CONTEXT, `リンク一覧読み込み失敗: ${message}`);
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [reloadTrigger]);

  /**
   * 指定IDのフォルダの展開/折りたたみを切り替える
   */
  const toggleExpand = useCallback((id: number): void => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /**
   * リンク/フォルダを削除する。削除後は一覧を再取得する
   */
  const handleDelete = useCallback(async (id: number): Promise<void> => {
    try {
      logger.info(CONTEXT, `リンク削除実行: id=${id}`);
      await deleteLink(id);
      logger.info(CONTEXT, `リンク削除完了: id=${id}`);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'リンクの削除に失敗しました。';
      logger.warn(CONTEXT, `リンク削除失敗: id=${id} - ${message}`);
      throw new Error(message);
    }
  }, []);

  return {
    links,
    loading,
    error,
    expandedIds,
    toggleExpand,
    handleDelete,
    reload,
  };
}
