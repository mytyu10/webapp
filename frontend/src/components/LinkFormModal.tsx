import { useMemo } from 'react';
import { LinkItem } from '../api/linkApi';
import { useLinkForm } from '../hooks/useLinkForm';
import FormField from './FormField';
import TextAreaField from './TextAreaField';
import SelectField from './SelectField';
import FormErrorBanner from './FormErrorBanner';
import SubmitButton from './SubmitButton';
import CancelButton from './CancelButton';

/** タイプ選択肢 */
const TYPE_OPTIONS = [
  { value: 'LINK', label: 'リンク' },
  { value: 'FOLDER', label: 'フォルダ' },
];

interface LinkFormModalProps {
  /** 編集対象（省略時は作成モード） */
  editItem?: LinkItem;
  /** フォームに表示するフォルダ一覧（親フォルダ選択肢として使用） */
  folders: LinkItem[];
  /** モーダルを閉じるコールバック */
  onClose: () => void;
  /** 作成・編集成功時のコールバック */
  onSuccess: () => void;
}

/**
 * フォルダ一覧をフラットな配列に展開する（ネスト構造を再帰的に展開）
 */
function flattenFolders(folders: LinkItem[]): LinkItem[] {
  const result: LinkItem[] = [];
  for (const folder of folders) {
    result.push(folder);
    const subFolders = folder.children.filter((c) => c.type === 'FOLDER');
    if (subFolders.length > 0) {
      result.push(...flattenFolders(subFolders));
    }
  }
  return result;
}

/**
 * 指定アイテムとその子孫の ID を Set に収集する
 */
function collectDescendantIds(item: LinkItem, ids: Set<number>): void {
  ids.add(item.id);
  item.children.forEach((child) => collectDescendantIds(child, ids));
}

/**
 * リンク/フォルダ作成・編集フォームモーダルコンポーネント
 * type が LINK の場合のみ URL 入力欄を表示する。
 * 親フォルダ選択肢には FOLDER タイプのみ表示する
 */
function LinkFormModal({ editItem, folders, onClose, onSuccess }: LinkFormModalProps) {
  const { input, errors, apiError, submitting, handleChange, handleSubmit } = useLinkForm({
    editItem,
    onSuccess,
  });

  /** 親フォルダ選択肢（FOLDER タイプのみ・フラット展開・自分自身と子孫を除外） */
  const folderOptions = useMemo(() => {
    const allFolders = flattenFolders(folders);
    const excludeIds = new Set<number>();
    if (editItem?.type === 'FOLDER') {
      collectDescendantIds(editItem, excludeIds);
    }
    return [
      { value: '', label: '（ルート直下）' },
      ...allFolders
        .filter((f) => !excludeIds.has(f.id))
        .map((f) => ({ value: String(f.id), label: f.title })),
    ];
  }, [folders, editItem]);

  /**
   * フォーム送信を処理する
   */
  async function onFormSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    await handleSubmit();
  }

  const isEditMode = editItem !== undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-form-modal-title"
    >
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2
          id="link-form-modal-title"
          className="text-base font-semibold text-slate-100 mb-4"
        >
          {isEditMode ? 'リンク/フォルダを編集' : 'リンク/フォルダを追加'}
        </h2>

        <form onSubmit={onFormSubmit} noValidate>
          <FormErrorBanner message={apiError} />

          {/* タイプ選択（編集時は変更不可） */}
          <SelectField
            id="link-type"
            label="タイプ"
            value={input.type}
            onChange={(v) => handleChange('type', v)}
            options={TYPE_OPTIONS}
            disabled={isEditMode}
          />

          {/* タイトル */}
          <FormField
            id="link-title"
            label="タイトル"
            value={input.title}
            onChange={(v) => handleChange('title', v)}
            error={errors.title}
            maxLength={200}
            disabled={submitting}
          />

          {/* URL（LINK タイプのみ表示） */}
          {input.type === 'LINK' && (
            <FormField
              id="link-url"
              label="URL"
              value={input.url}
              onChange={(v) => handleChange('url', v)}
              error={errors.url}
              maxLength={2000}
              disabled={submitting}
            />
          )}

          {/* 説明 */}
          <TextAreaField
            id="link-description"
            label="説明"
            value={input.description}
            onChange={(v) => handleChange('description', v)}
            rows={3}
            maxLength={1000}
            disabled={submitting}
          />

          {/* 親フォルダ選択 */}
          <SelectField
            id="link-parent"
            label="親フォルダ"
            value={input.parent_id}
            onChange={(v) => handleChange('parent_id', v)}
            options={folderOptions}
            disabled={submitting}
          />

          <div className="flex gap-3 justify-end mt-2">
            <CancelButton onClick={onClose} disabled={submitting} />
            <SubmitButton
              label={isEditMode ? '更新する' : '追加する'}
              loadingLabel="保存中..."
              loading={submitting}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors"
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export default LinkFormModal;
