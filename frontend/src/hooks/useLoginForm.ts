import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../api/accountApi';
import { validateLoginForm, LoginFormErrors } from '../validation/loginValidation';

interface UseLoginFormReturn {
  username: string;
  password: string;
  errors: LoginFormErrors;
  apiError: string;
  loading: boolean;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useLoginForm(): UseLoginFormReturn {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApiError('');

    const validationErrors = validateLoginForm(username, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const token = await loginRequest(username, password);
      localStorage.setItem('token', token);
      navigate('/');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'サーバーへの接続に失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  return { username, password, errors, apiError, loading, setUsername, setPassword, handleSubmit };
}
