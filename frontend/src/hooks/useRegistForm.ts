import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registRequest } from '../api/accountApi';
import { validateRegistForm, RegistFormErrors } from '../validation/registValidation';

interface UseRegistFormReturn {
  username: string;
  password: string;
  errors: RegistFormErrors;
  apiError: string;
  loading: boolean;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

/**
 * アカウント登録フォームのカスタムフック
 * バリデーション、API通信、登録後の画面遷移を管理する
 */
export function useRegistForm(): UseRegistFormReturn {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<RegistFormErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApiError('');

    const validationErrors = validateRegistForm(username, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await registRequest(username, password);
      navigate('/login');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'サーバーへの接続に失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  return { username, password, errors, apiError, loading, setUsername, setPassword, handleSubmit };
}
