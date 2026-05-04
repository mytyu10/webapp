/** メッセージを管理する定数ファイル */
export const MESSAGE = {
  AUTH: {
    LOGIN_SUCCESS: 'ログイン成功',
    LOGIN_FAILED: 'ユーザーネームまたはパスワードが間違っています',
    REGIST_SUCCESS: 'アカウントの登録に成功しました',
    REGIST_FAILED: 'アカウントの作成に失敗しました',
    REGIST_DUPLICATE: 'このユーザー名は既に使用されています',
    UNAUTHORIZED: '認証が必要です',
    AUTH_INFO_FAILED: '認証情報の取得に失敗しました',
  },
  DB: {
    DB_ERROR: 'データベースエラーが発生しました',
  },
  VALIDATION: {
    INVALID_INPUT: '入力値が不正です',
  },
  TASK: {
    CREATE_SUCCESS: 'タスクを作成しました',
    UPDATE_SUCCESS: 'タスクを更新しました',
    QUEUE_UPDATE_SUCCESS: 'タスクをキューで処理し更新しました',
    DELETE_SUCCESS: 'タスクを削除しました',
    NOT_FOUND: '指定されたタスクが見つかりません',
    CREATE_FAILED: 'タスクの作成に失敗しました',
    UPDATE_FAILED: 'タスクの更新に失敗しました',
    DELETE_FAILED: 'タスクの削除に失敗しました',
    CATEGORIES_FETCH_FAILED: 'カテゴリ一覧の取得に失敗しました',
  },
  EVENT: {
    CREATE_SUCCESS: '予定を作成しました',
    UPDATE_SUCCESS: '予定を更新しました',
    DELETE_SUCCESS: '予定を削除しました',
    NOT_FOUND: '指定された予定が見つかりません',
    CREATE_FAILED: '予定の作成に失敗しました',
    UPDATE_FAILED: '予定の更新に失敗しました',
    DELETE_FAILED: '予定の削除に失敗しました',
    FORBIDDEN: 'この予定を操作する権限がありません',
  },
};
