import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWebAuthn } from '../hooks/useWebAuthn';
import { getCurrentUsername } from '../api/taskApi';
import FormErrorBanner from '../components/FormErrorBanner';

function WebAuthnRegisterPage() {
  const username = getCurrentUsername();
  const { registerWebAuthn, loading, error, clearError } = useWebAuthn();
  const [successMessage, setSuccessMessage] = useState('');

  async function handleRegister() {
    if (!username) return;
    clearError();
    setSuccessMessage('');

    try {
      await registerWebAuthn(username);
      setSuccessMessage('顔認証の登録が完了しました。次回ログインから顔認証が使用できます。');
    } catch {
      // エラーはuseWebAuthn内でsetErrorに設定済み
    }
  }

  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">ログインが必要です</div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-12 px-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">顔認証設定</h1>
        <p className="text-slate-400 text-sm mb-6">
          デバイスの生体認証（Face ID・指紋・Windows Hello等）を登録すると、
          次回ログインからパスワード不要で認証できます。
        </p>

        <div className="mb-6 p-4 bg-slate-700 rounded-lg">
          <p className="text-slate-300 text-sm">
            <span className="text-slate-500">登録ユーザー：</span>
            <span className="font-medium text-slate-100">{username}</span>
          </p>
        </div>

        <FormErrorBanner message={error} />

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-900/40 border border-emerald-700 rounded-lg">
            <p className="text-emerald-300 text-sm">{successMessage}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleRegister}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              登録中...
            </>
          ) : (
            <>
              <span aria-hidden="true">&#128247;</span>
              顔認証を登録する
            </>
          )}
        </button>

        <p className="mt-4 text-xs text-slate-500">
          ※ お使いのデバイスが生体認証に対応している必要があります。
          登録後はパスワードでのログインも引き続き利用できます。
        </p>

        <div className="mt-6 pt-4 border-t border-slate-700">
          <Link
            to="/tasks"
            className="text-sm text-sky-400 hover:text-sky-300 underline"
          >
            タスク一覧に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

export default WebAuthnRegisterPage;
