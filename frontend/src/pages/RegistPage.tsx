import { Link } from 'react-router-dom';
import { useRegistForm } from '../hooks/useRegistForm';
import FormCard from '../components/FormCard';
import FormField from '../components/FormField';
import FormErrorBanner from '../components/FormErrorBanner';
import SubmitButton from '../components/SubmitButton';

/**
 * アカウント登録ページ
 */
function RegistPage() {
  const { username, password, errors, apiError, loading, setUsername, setPassword, handleSubmit } = useRegistForm();

  return (
    <FormCard title="アカウント登録" onSubmit={handleSubmit}>
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
        autoComplete="new-password"
        disabled={loading}
      />
      <FormErrorBanner message={apiError} />
      <SubmitButton label="登録" loading={loading} />
      <p className="mt-4 text-center text-sm text-slate-400">
        すでにアカウントをお持ちの方は{' '}
        <Link to="/login" className="text-sky-400 hover:text-sky-300 underline">
          こちら
        </Link>
      </p>
    </FormCard>
  );
}

export default RegistPage;
