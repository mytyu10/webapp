import { LinkItemType } from '../api/linkApi';

/** リンクフォームの入力値型 */
export interface LinkItemFormInput {
  title: string;
  url: string;
  description: string;
  type: LinkItemType;
  parent_id: string;
}

/** バリデーションエラーの型 */
export interface LinkValidationErrors {
  title?: string;
  url?: string;
}

/**
 * リンク/フォルダフォームの入力値を検証する。
 * title は必須。type が LINK の場合は url も必須。
 * エラーがない場合は空オブジェクトを返す
 */
export function validateLinkItem(input: LinkItemFormInput): LinkValidationErrors {
  const errors: LinkValidationErrors = {};

  if (!input.title.trim()) {
    errors.title = 'タイトルを入力してください';
  }

  if (input.type === 'LINK' && !input.url.trim()) {
    errors.url = 'URLを入力してください';
  }

  return errors;
}

/**
 * バリデーションエラーが存在するか判定する
 */
export function hasValidationErrors(errors: LinkValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
