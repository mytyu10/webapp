import { useState, useCallback } from 'react';
import { createLink, updateLink, LinkItem } from '../api/linkApi';
import {
  LinkItemFormInput,
  LinkValidationErrors,
  validateLinkItem,
  hasValidationErrors,
} from '../validation/linkValidation';
import { logger } from '../logger';

const CONTEXT = 'useLinkForm';

/** useLinkForm フックのオプション型 */
interface UseLinkFormOptions {
  /** 編集対象の LinkItem（省略時は作成モード） */
  editItem?: LinkItem;
  /** 成功時のコールバック */
  onSuccess: () => void;
}

/** useLinkForm フックの戻り値型 */
interface UseLinkFormReturn {
  input: LinkItemFormInput;
  errors: LinkValidationErrors;
  apiError: string;
  submitting: boolean;
  handleChange: (field: keyof LinkItemFormInput, value: string) => void;
  handleSubmit: () => Promise<void>;
}

/** フォームの初期値を生成する */
function buildInitialInput(editItem?: LinkItem): LinkItemFormInput {
  if (editItem) {
    return {
      title: editItem.title,
      url: editItem.url ?? '',
      description: editItem.description,
      type: editItem.type,
      parent_id: editItem.parent_id !== null ? String(editItem.parent_id) : '',
    };
  }
  return {
    title: '',
    url: '',
    description: '',
    type: 'LINK',
    parent_id: '',
  };
}

/**
 * リンク/フォルダの作成・編集フォームを管理するカスタムフック。
 * 編集時は editItem を渡す。作成時は省略する
 */
export function useLinkForm({ editItem, onSuccess }: UseLinkFormOptions): UseLinkFormReturn {
  const [input, setInput] = useState<LinkItemFormInput>(() => buildInitialInput(editItem));
  const [errors, setErrors] = useState<LinkValidationErrors>({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * フォームフィールドの値を更新する。
   * type が FOLDER に変更された場合は url をクリアする
   */
  const handleChange = useCallback((field: keyof LinkItemFormInput, value: string): void => {
    setInput((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'type' && value === 'FOLDER') {
        next.url = '';
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setApiError('');
  }, []);

  /**
   * フォームを送信する。バリデーション後に作成または更新 API を呼び出す
   */
  const handleSubmit = useCallback(async (): Promise<void> => {
    const validationErrors = validateLinkItem(input);
    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setApiError('');

    try {
      const payload = {
        title: input.title.trim(),
        url: input.type === 'LINK' ? input.url.trim() : undefined,
        description: input.description.trim(),
        type: input.type,
        parent_id: input.parent_id ? parseInt(input.parent_id, 10) : undefined,
      };

      if (editItem) {
        logger.info(CONTEXT, `リンク更新実行: id=${editItem.id}`);
        await updateLink(editItem.id, payload);
        logger.info(CONTEXT, `リンク更新完了: id=${editItem.id}`);
      } else {
        logger.info(CONTEXT, `リンク作成実行: ${payload.title}`);
        await createLink({ ...payload, type: input.type });
        logger.info(CONTEXT, 'リンク作成完了');
      }

      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'リンクの保存に失敗しました。';
      logger.warn(CONTEXT, `リンク保存失敗: ${message}`);
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  }, [input, editItem, onSuccess]);

  return { input, errors, apiError, submitting, handleChange, handleSubmit };
}
