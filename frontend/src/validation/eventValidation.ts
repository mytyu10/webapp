/** 予定フォームのバリデーションエラー型 */
export interface EventValidationErrors {
  title?: string;
  start_at?: string;
  end_at?: string;
}

/** 予定フォームの入力値型 */
export interface EventFormValues {
  title: string;
  description: string;
  start_at: string;
  end_at: string;
}

/** タイトルの最大文字数 */
const TITLE_MAX_LENGTH = 200;

/**
 * 予定フォームをバリデーションする。
 * エラーがない場合は空オブジェクトを返す
 */
export function validateEventForm(values: EventFormValues): EventValidationErrors {
  const errors: EventValidationErrors = {};

  if (!values.title.trim()) {
    errors.title = 'タイトルを入力してください';
  } else if (values.title.length > TITLE_MAX_LENGTH) {
    errors.title = `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください`;
  }

  if (!values.start_at) {
    errors.start_at = '開始日時を入力してください';
  }

  if (!values.end_at) {
    errors.end_at = '終了日時を入力してください';
  } else if (values.start_at && values.end_at <= values.start_at) {
    errors.end_at = '終了日時は開始日時より後に設定してください';
  }

  return errors;
}

/**
 * バリデーションエラーが存在しないか確認する
 */
export function isEventFormValid(errors: EventValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}
