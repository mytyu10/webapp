import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchContacts,
  fetchAllUsers,
  fetchMessages,
  sendMessage,
  ChatMessage,
  ChatContact,
} from '../api/chatApi';
import { getCurrentUsername } from '../api/taskApi';
import { logger } from '../logger';

const CONTEXT = 'useChat';

/** ポーリング間隔（ミリ秒） */
const POLLING_INTERVAL_MS = 3000;

/** useChat フックの戻り値型 */
interface UseChatReturn {
  /** やり取りしたことのある相手一覧 */
  contacts: ChatContact[];
  /** 全ユーザー一覧（相手選択用） */
  allUsers: ChatContact[];
  /** 現在選択中のチャット相手 */
  selectedUser: string | null;
  /** 現在のチャット相手とのメッセージ一覧 */
  messages: ChatMessage[];
  /** 入力中のメッセージ内容 */
  inputContent: string;
  /** ローディング状態 */
  loading: boolean;
  /** メッセージ送信中状態 */
  sending: boolean;
  /** エラーメッセージ */
  error: string;
  /** 現在ログイン中のユーザー名 */
  currentUser: string | null;
  /** チャット相手を選択する */
  selectUser: (username: string) => void;
  /** 入力内容を更新する */
  setInputContent: (content: string) => void;
  /** メッセージを送信する */
  handleSend: () => Promise<void>;
}

/**
 * チャット機能を管理するカスタムフック。
 * - 相手ユーザー選択
 * - 3秒ポーリングによるメッセージ自動更新
 * - メッセージ送信（REST API 経由）
 * - 初期メッセージ一覧は REST API で取得
 */
export function useChat(): UseChatReturn {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [allUsers, setAllUsers] = useState<ChatContact[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const currentUser = getCurrentUsername();

  /** ポーリングタイマーの ref */
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 選択中のチャット相手を ref でも保持する（ポーリングコールバック内で参照するため） */
  const selectedUserRef = useRef<string | null>(null);

  /**
   * 連絡先一覧と全ユーザー一覧を初期ロードする
   */
  useEffect(() => {
    let cancelled = false;

    async function loadInitial(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        logger.info(CONTEXT, '初期データ読み込み開始');
        const [contactsData, usersData] = await Promise.all([
          fetchContacts(),
          fetchAllUsers(),
        ]);
        if (!cancelled) {
          setContacts(contactsData);
          setAllUsers(usersData);
          logger.info(
            CONTEXT,
            `初期データ読み込み完了: contacts=${contactsData.length}, users=${usersData.length}`,
          );
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'データの取得に失敗しました。';
          logger.warn(CONTEXT, `初期データ読み込み失敗: ${message}`);
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 選択ユーザーが変わったときに過去メッセージを REST API で取得し、ポーリングを開始する
   */
  useEffect(() => {
    selectedUserRef.current = selectedUser;

    // 既存のポーリングを停止する
    if (pollingTimerRef.current !== null) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    if (!selectedUser) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function loadMessages(): Promise<void> {
      const target = selectedUserRef.current;
      if (!target) return;
      try {
        logger.info(CONTEXT, `メッセージ読み込み: with=${target}`);
        const data = await fetchMessages(target);
        if (!cancelled) {
          setMessages(data);
          logger.info(CONTEXT, `メッセージ読み込み完了: count=${data.length}`);
        }
      } catch (err) {
        if (!cancelled) {
          logger.warn(
            CONTEXT,
            `メッセージ読み込み失敗: ${err instanceof Error ? err.message : '不明なエラー'}`,
          );
        }
      }
    }

    // 初回ロード
    void loadMessages();

    // ポーリング開始
    logger.info(CONTEXT, `ポーリング開始: interval=${POLLING_INTERVAL_MS}ms`);
    pollingTimerRef.current = setInterval(() => {
      void loadMessages();
    }, POLLING_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pollingTimerRef.current !== null) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
        logger.info(CONTEXT, 'ポーリング停止（クリーンアップ）');
      }
    };
  }, [selectedUser]);

  /**
   * チャット相手を選択する
   */
  const selectUser = useCallback((username: string): void => {
    logger.info(CONTEXT, `チャット相手選択: ${username}`);
    setSelectedUser(username);
    setMessages([]);
    setInputContent('');
  }, []);

  /**
   * メッセージを REST API で送信する。
   * 送信後はメッセージ一覧と連絡先一覧を更新する
   */
  const handleSend = useCallback(async (): Promise<void> => {
    if (!selectedUser || !inputContent.trim()) return;

    setSending(true);
    try {
      logger.info(CONTEXT, `メッセージ送信（REST）: to=${selectedUser}`);
      await sendMessage(selectedUser, inputContent.trim());
      setInputContent('');
      logger.info(CONTEXT, 'メッセージ送信完了');

      // 送信後に最新メッセージと連絡先一覧を即時取得する
      const [updatedMessages, updatedContacts] = await Promise.all([
        fetchMessages(selectedUser),
        fetchContacts(),
      ]);
      setMessages(updatedMessages);
      setContacts(updatedContacts);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'メッセージの送信に失敗しました。';
      logger.warn(CONTEXT, `メッセージ送信失敗: ${message}`);
      setError(message);
    } finally {
      setSending(false);
    }
  }, [selectedUser, inputContent]);

  return {
    contacts,
    allUsers,
    selectedUser,
    messages,
    inputContent,
    loading,
    sending,
    error,
    currentUser,
    selectUser,
    setInputContent,
    handleSend,
  };
}
