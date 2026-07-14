import { useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatContact } from '../api/chatApi';

/**
 * チャット画面
 * 左ペイン: ユーザーリスト（やり取り済み相手 + 全ユーザー）
 * 右ペイン: メッセージ一覧 + 入力欄
 */
function ChatPage() {
  const {
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
  } = useChat();

  /** メッセージ末尾に自動スクロールするための ref */
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /** メッセージが更新されたら末尾にスクロールする */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Enter キー（Shift+Enter 以外）でメッセージを送信する
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  /**
   * 既にやり取りしたことのある相手を除いた全ユーザー一覧を返す
   */
  function getNewUsers(): ChatContact[] {
    const contactUsernames = new Set(contacts.map((c) => c.username));
    return allUsers.filter((u) => !contactUsernames.has(u.username));
  }

  const newUsers = getNewUsers();

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* 左ペイン: ユーザーリスト */}
      <aside className="w-56 sm:w-64 flex-shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-700">
          <h1 className="text-base font-bold text-slate-100">チャット</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-4 text-sm text-slate-400">読み込み中...</p>
          ) : (
            <>
              {/* やり取り済み相手 */}
              {contacts.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    最近の会話
                  </p>
                  {contacts.map((contact) => (
                    <button
                      key={contact.username}
                      type="button"
                      onClick={() => selectUser(contact.username)}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        selectedUser === contact.username
                          ? 'bg-sky-800 text-white'
                          : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-medium">{contact.username}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 新しい相手（まだ会話がないユーザー） */}
              {newUsers.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    ユーザー
                  </p>
                  {newUsers.map((user) => (
                    <button
                      key={user.username}
                      type="button"
                      onClick={() => selectUser(user.username)}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        selectedUser === user.username
                          ? 'bg-sky-800 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {user.username}
                    </button>
                  ))}
                </div>
              )}

              {contacts.length === 0 && allUsers.length === 0 && (
                <p className="px-4 py-4 text-sm text-slate-400">
                  他のユーザーがいません
                </p>
              )}
            </>
          )}
        </div>
      </aside>

      {/* 右ペイン: メッセージエリア */}
      <main className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            {/* ヘッダー */}
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-900 flex-shrink-0">
              <h2 className="text-base font-bold text-slate-100">{selectedUser}</h2>
            </div>

            {/* メッセージ一覧 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
              {messages.length === 0 ? (
                <p className="text-sm text-slate-400 text-center mt-8">
                  まだメッセージがありません。最初のメッセージを送りましょう。
                </p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.from_user === currentUser;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs sm:max-w-md lg:max-w-lg ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        {/* 送信者名（相手のメッセージのみ表示） */}
                        {!isMine && (
                          <span className="text-xs text-slate-400 px-1">
                            {msg.from_user}
                          </span>
                        )}
                        {/* メッセージバブル */}
                        <div
                          className={`px-4 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap ${
                            isMine
                              ? 'bg-sky-700 text-white rounded-br-sm'
                              : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                        {/* 送信時刻 */}
                        <span className="text-xs text-slate-500 px-1">
                          {new Date(msg.created_at).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 入力エリア */}
            <div className="px-6 py-4 border-t border-slate-700 bg-slate-900 flex-shrink-0">
              <div className="flex gap-3 items-end">
                <textarea
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力... (Enter で送信、Shift+Enter で改行)"
                  rows={2}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-transparent [color-scheme:dark]"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !inputContent.trim()}
                  className="flex-shrink-0 px-4 py-2 bg-sky-700 hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {sending ? '送信中' : '送信'}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* 相手未選択時のプレースホルダー */
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-500 text-sm">
              左のリストからチャット相手を選択してください
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default ChatPage;
