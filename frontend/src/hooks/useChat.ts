import { useState, useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import {
  fetchContacts,
  fetchAllUsers,
  fetchMessages,
  ChatMessage,
  ChatContact,
} from '../api/chatApi';
import { getCurrentUsername } from '../api/taskApi';
import { createChatSocket } from '../socket/chatSocket';
import { logger } from '../logger';

const CONTEXT = 'useChat';

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
 * - Socket.io によるリアルタイムメッセージ受信
 * - メッセージ送信（WebSocket 経由）
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

  /** Socket.io インスタンスを保持する ref */
  const socketRef = useRef<Socket | null>(null);
  /** 選択中のチャット相手を ref でも保持する（イベントリスナー内で参照するため） */
  const selectedUserRef = useRef<string | null>(null);

  /**
   * Socket.io の接続を初期化し、リアルタイムメッセージ受信を設定する
   */
  useEffect(() => {
    logger.info(CONTEXT, 'WebSocket 接続開始');
    const socket = createChatSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      logger.info(CONTEXT, `WebSocket 接続成功: socketId=${socket.id}`);
    });

    socket.on('connect_error', (err: Error) => {
      logger.warn(CONTEXT, `WebSocket 接続エラー: ${err.message}`);
      setError('チャットサーバーへの接続に失敗しました。');
    });

    socket.on('disconnect', (reason: string) => {
      logger.info(CONTEXT, `WebSocket 切断: reason=${reason}`);
    });

    /**
     * サーバーから receive_message イベントを受信したときのハンドラ
     * 現在選択中のチャット相手のメッセージのみ表示する
     */
    socket.on('receive_message', (msg: ChatMessage) => {
      const partner = selectedUserRef.current;
      const isMine = msg.from_user === currentUser;
      const isFromPartner = msg.from_user === partner;
      const isToPartner = msg.to_user === partner;

      // 現在選択中の相手との会話のメッセージのみ追加する
      if (partner && (isMine ? isToPartner : isFromPartner)) {
        logger.info(
          CONTEXT,
          `receive_message: id=${msg.id}, from=${msg.from_user}, to=${msg.to_user}`,
        );
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.connect();

    return () => {
      logger.info(CONTEXT, 'WebSocket 切断（クリーンアップ）');
      socket.disconnect();
      socketRef.current = null;
    };
    // currentUser は初期化時に確定しているため依存配列から除外する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
   * 選択ユーザーが変わったときに過去メッセージを REST API で取得する
   */
  useEffect(() => {
    selectedUserRef.current = selectedUser;

    if (!selectedUser) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function loadMessages(): Promise<void> {
      if (!selectedUser) return;
      try {
        logger.info(CONTEXT, `過去メッセージ読み込み: with=${selectedUser}`);
        const data = await fetchMessages(selectedUser);
        if (!cancelled) {
          setMessages(data);
          logger.info(CONTEXT, `過去メッセージ読み込み完了: count=${data.length}`);
        }
      } catch (err) {
        if (!cancelled) {
          logger.warn(
            CONTEXT,
            `過去メッセージ読み込み失敗: ${err instanceof Error ? err.message : '不明なエラー'}`,
          );
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
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
   * メッセージを WebSocket で送信する。
   * 送信後は fetchContacts で連絡先一覧を更新する
   */
  const handleSend = useCallback(async (): Promise<void> => {
    if (!selectedUser || !inputContent.trim()) return;
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setError('チャットサーバーに接続されていません。');
      return;
    }

    setSending(true);
    try {
      logger.info(CONTEXT, `メッセージ送信（WebSocket）: to=${selectedUser}`);
      socket.emit('send_message', {
        to_user: selectedUser,
        content: inputContent.trim(),
      });
      setInputContent('');
      logger.info(CONTEXT, 'メッセージ送信完了');

      /** 連絡先一覧を更新する（新しい相手への初回送信時に一覧に追加されるため） */
      const updatedContacts = await fetchContacts();
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
