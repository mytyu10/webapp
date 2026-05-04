import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/** リダイレクトまでの待機秒数 */
const REDIRECT_DELAY_MS = 2000;

/**
 * LINE連携コールバックページ
 * LINE OAuth完了後にリダイレクトされるページ。
 * クエリパラメータ status=success の場合は成功メッセージを表示してタスク一覧へ遷移する。
 * status=error の場合はエラーメッセージを表示する。
 */
function LineCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');
  const isSuccess = status === 'success';

  const [countdown, setCountdown] = useState(REDIRECT_DELAY_MS / 1000);

  useEffect(() => {
    if (!isSuccess) return;

    /** 成功時は一定時間後にタスク一覧へリダイレクトする */
    const timer = setTimeout(() => {
      navigate('/tasks');
    }, REDIRECT_DELAY_MS);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
    };
  }, [isSuccess, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center space-y-4">
        {isSuccess ? (
          <>
            <div className="text-green-400 text-4xl">&#10003;</div>
            <h1 className="text-xl font-bold text-slate-100">LINE連携が完了しました</h1>
            <p className="text-sm text-slate-400">
              {countdown}秒後にタスク一覧へ移動します...
            </p>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="mt-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-md transition-colors"
            >
              今すぐ移動する
            </button>
          </>
        ) : (
          <>
            <div className="text-red-400 text-4xl">&#10007;</div>
            <h1 className="text-xl font-bold text-slate-100">LINE連携に失敗しました</h1>
            <p className="text-sm text-slate-400">
              再度お試しいただくか、しばらくしてから試してください。
            </p>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="mt-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold rounded-md transition-colors"
            >
              タスク一覧へ戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default LineCallbackPage;
