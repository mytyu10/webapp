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
 * - メッセージ一覧のポーリング（3秒間隔）
 * - メッセージ送信
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

  /** ポーリング用タイマーIDを保持する ref */
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          const message = err instanceof Error ? err.message : 'データの取得に失敗しました。';
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
   * 選択ユーザーが変わったときにメッセージ一覧をポーリングする
   */
  useEffect(() => {
    /** 既存のポーリングタイマーをクリアする */
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
      if (!selectedUser) return;
      try {
        logger.info(CONTEXT, `メッセージ読み込み: with=${selectedUser}`);
        const data = await fetchMessages(selectedUser);
        if (!cancelled) {
          setMessages(data);
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

    /** 初回即時実行 */
    void loadMessages();

    /** ポーリング設定 */
    pollingTimerRef.current = setInterval(() => {
      void loadMessages();
    }, POLLING_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pollingTimerRef.current !== null) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
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
   * メッセージを送信する。送信後はメッセージ一覧をリロードし、連絡先も更新する
   */
  const handleSend = useCallback(async (): Promise<void> => {
    if (!selectedUser || !inputContent.trim()) return;

    setSending(true);
    try {
      logger.info(CONTEXT, `メッセージ送信: to=${selectedUser}`);
      const newMessage = await sendMessage(selectedUser, inputContent.trim());
      setMessages((prev) => [...prev, newMessage]);
      setInputContent('');
      logger.info(CONTEXT, 'メッセージ送信完了');

      /** 連絡先一覧を更新する（新しい相手への初回送信時に一覧に追加されるため） */
      const updatedContacts = await fetchContacts();
      setContacts(updatedContacts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'メッセージの送信に失敗しました。';
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
