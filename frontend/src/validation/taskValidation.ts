import { Priority, PRIORITY_VALUES } from '../api/taskApi';

/** タスクフォームのエラー型 */
export interface TaskFormErrors {
  title?: string;
  description?: string;
  due_date?: string;
  assignees?: string;
  priority?: string;
  category?: string;
}

/** タスクフォームの入力値型 */
export interface TaskFormValues {
  title: string;
  description: string;
  due_date: string;
  assigneesText: string;
  priority: Priority;
  category: string;
}

/** タイトルの最大文字数 */
const TITLE_MAX_LENGTH = 200;

/** 説明文の最大文字数 */
const DESCRIPTION_MAX_LENGTH = 1000;

/** 担当者の最大人数 */
const ASSIGNEES_MAX_COUNT = 50;

/** カテゴリの最大文字数 */
const CATEGORY_MAX_LENGTH = 100;

/**
 * タスクフォームのバリデーションを行う純粋関数
 * エラーがある場合はエラーオブジェクトを返す
 */
export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};

  if (!values.title.trim()) {
    errors.title = 'タイトルを入力してください';
  } else if (values.title.length > TITLE_MAX_LENGTH) {
    errors.title = `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください`;
  }

  if (!values.description.trim()) {
    errors.description = '説明文を入力してください';
  } else if (values.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `説明文は${DESCRIPTION_MAX_LENGTH}文字以内で入力してください`;
  }

  if (!values.due_date) {
    errors.due_date = '期限を入力してください';
  } else {
    const date = new Date(values.due_date);
    if (isNaN(date.getTime())) {
      errors.due_date = '正しい日時形式で入力してください';
    }
  }

  if (values.assigneesText.trim()) {
    const assignees = values.assigneesText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (assignees.length > ASSIGNEES_MAX_COUNT) {
      errors.assignees = `担当者は${ASSIGNEES_MAX_COUNT}人以内で設定してください`;
    }
  }

  if (!PRIORITY_VALUES.includes(values.priority)) {
    errors.priority = '優先度はHIGH・MEDIUM・LOWのいずれかを選択してください';
  }

  if (values.category.length > CATEGORY_MAX_LENGTH) {
    errors.category = `カテゴリは${CATEGORY_MAX_LENGTH}文字以内で入力してください`;
  }

  return errors;
}

/**
 * 担当者テキスト（カンマ区切り）をユーザー名リストに変換する
 */
export function parseAssignees(assigneesText: string): string[] {
  return assigneesText
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
