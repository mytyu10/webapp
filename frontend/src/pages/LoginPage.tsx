import { Link, useNavigate } from 'react-router-dom';
import { useLoginForm } from '../hooks/useLoginForm';
import { useWebAuthn } from '../hooks/useWebAuthn';
import FormCard from '../components/FormCard';
import FormField from '../components/FormField';
import FormErrorBanner from '../components/FormErrorBanner';
import SubmitButton from '../components/SubmitButton';

function LoginPage() {
  const { username, password, errors, apiError, loading, setUsername, setPassword, handleSubmit } = useLoginForm();
  const { authenticateWithWebAuthn, loading: webAuthnLoading, error: webAuthnError, clearError } = useWebAuthn();
  const navigate = useNavigate();

  async function handleWebAuthnLogin() {
    clearError();
    try {
      await authenticateWithWebAuthn(username);
      navigate('/');
    } catch {
      // エラーはuseWebAuthn内でsetErrorに設定済み
    }
  }

  const isAnyLoading = loading || webAuthnLoading;

  return (
    <FormCard title="ログイン" onSubmit={handleSubmit}>
      <FormField
        id="username"
        label="ユーザー名"
        value={username}
        onChange={setUsername}
        error={errors.username}
        maxLength={10}
        autoComplete="username"
        disabled={isAnyLoading}
      />
      <FormField
        id="password"
        label="パスワード"
        type="password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        autoComplete="current-password"
        disabled={isAnyLoading}
      />
      <FormErrorBanner message={apiError || webAuthnError} />
      <SubmitButton label="ログイン" loading={loading} />

      {/* 顔認証ログインボタン */}
      <div className="mt-3">
        <button
          type="button"
          onClick={handleWebAuthnLogin}
          disabled={!username.trim() || isAnyLoading}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {webAuthnLoading ? (
            <span className="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full" />
          ) : (
            <span aria-hidden="true">&#128247;</span>
          )}
          顔認証でログイン
        </button>
        {!username.trim() && (
          <p className="mt-1 text-xs text-slate-500 text-center">
            ユーザー名を入力すると顔認証でログインできます
          </p>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-slate-400">
        アカウント登録は{' '}
        <Link to="/regist" className="text-sky-400 hover:text-sky-300 underline">
          こちら
        </Link>
      </p>
    </FormCard>
  );
}

export default LoginPage;
