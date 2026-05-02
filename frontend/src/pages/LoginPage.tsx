import { Link } from 'react-router-dom';
import { useLoginForm } from '../hooks/useLoginForm';
import FormCard from '../components/FormCard';
import FormField from '../components/FormField';
import FormErrorBanner from '../components/FormErrorBanner';
import SubmitButton from '../components/SubmitButton';

function LoginPage() {
  const { username, password, errors, apiError, loading, setUsername, setPassword, handleSubmit } = useLoginForm();

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
        disabled={loading}
      />
      <FormField
        id="password"
        label="パスワード"
        type="password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        autoComplete="current-password"
        disabled={loading}
      />
      <FormErrorBanner message={apiError} />
      <SubmitButton label="ログイン" loading={loading} />
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
