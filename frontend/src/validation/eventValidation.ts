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

/** 複数日付フォームのバリデーションエラー型 */
export interface MultipleEventValidationErrors {
  title?: string;
  start_times?: string;
  end_times?: string;
}

/** 複数日付フォームの入力値型 */
export interface MultipleEventFormValues {
  title: string;
  description: string;
  /** 開始日時の配列（datetime-local形式） */
  start_times: string[];
  /** 終了日時の配列（datetime-local形式）。start_times と同件数 */
  end_times: string[];
}

/** 繰り返しフォームのバリデーションエラー型 */
export interface RepeatEventValidationErrors {
  title?: string;
  start_at?: string;
  end_at?: string;
  end_condition?: string;
}

/** 繰り返しフォームの入力値型 */
export interface RepeatEventFormValues {
  title: string;
  description: string;
  /** 繰り返しの最初の開始日時（datetime-local形式） */
  start_at: string;
  /** 繰り返しの最初の終了日時（datetime-local形式） */
  end_at: string;
  repeat_type: 'daily' | 'weekly' | 'monthly';
  interval: string;
  days_of_week: number[];
  /** 終了条件の種別 */
  end_condition_type: 'end_date' | 'count';
  end_date: string;
  count: string;
}

/** タイトルの最大文字数 */
const TITLE_MAX_LENGTH = 200;

/** 繰り返し予定の最大生成件数（フロントエンド事前チェック用） */
const REPEAT_MAX_COUNT = 100;

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

/**
 * 複数日付フォームをバリデーションする。
 * エラーがない場合は空オブジェクトを返す
 */
export function validateMultipleEventForm(
  values: MultipleEventFormValues,
): MultipleEventValidationErrors {
  const errors: MultipleEventValidationErrors = {};

  if (!values.title.trim()) {
    errors.title = 'タイトルを入力してください';
  } else if (values.title.length > TITLE_MAX_LENGTH) {
    errors.title = `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください`;
  }

  if (values.start_times.length === 0) {
    errors.start_times = '開始日時を1つ以上追加してください';
  } else if (values.start_times.some((t) => !t)) {
    errors.start_times = '空の開始日時があります。入力するか削除してください';
  } else if (values.start_times.length > REPEAT_MAX_COUNT) {
    errors.start_times = `開始日時は${REPEAT_MAX_COUNT}件以内で指定してください`;
  }

  if (values.end_times.some((t) => !t)) {
    errors.end_times = '空の終了日時があります。入力してください';
  } else {
    const hasInvalidRange = values.start_times.some(
      (start, i) => values.end_times[i] && values.end_times[i] <= start,
    );
    if (hasInvalidRange) {
      errors.end_times = '終了日時は対応する開始日時より後に設定してください';
    }
  }

  return errors;
}

/**
 * 複数日付フォームのバリデーションエラーが存在しないか確認する
 */
export function isMultipleEventFormValid(errors: MultipleEventValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}

/**
 * 繰り返しフォームをバリデーションする。
 * エラーがない場合は空オブジェクトを返す
 */
export function validateRepeatEventForm(
  values: RepeatEventFormValues,
): RepeatEventValidationErrors {
  const errors: RepeatEventValidationErrors = {};

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

  if (values.end_condition_type === 'end_date') {
    if (!values.end_date) {
      errors.end_condition = '終了日を入力してください';
    } else if (values.start_at && values.end_date < values.start_at) {
      errors.end_condition = '終了日は開始日時より後に設定してください';
    }
  } else {
    const countNum = Number(values.count);
    if (!values.count || isNaN(countNum) || countNum <= 0) {
      errors.end_condition = '繰り返し回数は1以上の整数で入力してください';
    } else if (countNum > REPEAT_MAX_COUNT) {
      errors.end_condition = `繰り返し回数は${REPEAT_MAX_COUNT}回以内で指定してください`;
    }
  }

  return errors;
}

/**
 * 繰り返しフォームのバリデーションエラーが存在しないか確認する
 */
export function isRepeatEventFormValid(errors: RepeatEventValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}
