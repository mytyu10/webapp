import { LinkItem } from '../api/linkApi';

/** フォルダ展開アイコン */
const ICON_FOLDER_CLOSED = '▶';
/** フォルダ折りたたみアイコン */
const ICON_FOLDER_OPEN = '▼';
/** フォルダアイコン */
const ICON_FOLDER = '📁';
/** リンクアイコン */
const ICON_LINK = '🔗';

/** 階層深さに対応するインデントクラス */
const DEPTH_INDENT_CLASSES: Record<number, string> = {
  0: 'pl-0',
  1: 'pl-6',
  2: 'pl-12',
  3: 'pl-18',
};
/** インデントフォールバッククラス */
const INDENT_FALLBACK = 'pl-24';

export interface LinkTreeNodeProps {
  item: LinkItem;
  depth: number;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  onEdit: (item: LinkItem) => void;
  onDelete: (item: LinkItem) => void;
  onShare: (item: LinkItem) => void;
  currentUsername: string | null;
}

/**
 * リンクツリーの1ノードを再帰的にレンダリングするコンポーネント。
 * FOLDER タイプはクリックで展開/折りたたみでき、子要素を再帰的にレンダリングする。
 * LINK タイプは別タブでリンクを開く。
 * 操作ボタン（編集・共有・削除）はホバー時に表示する
 */
function LinkTreeNode({
  item,
  depth,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  onShare,
  currentUsername,
}: LinkTreeNodeProps) {
  const isOwner = item.created_by === currentUsername;
  const indentClass = DEPTH_INDENT_CLASSES[depth] ?? INDENT_FALLBACK;

  if (item.type === 'FOLDER') {
    const isExpanded = expandedIds.has(item.id);

    return (
      <li>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-700/60 group ${indentClass}`}
        >
          {/* 展開/折りたたみボタン */}
          <button
            type="button"
            onClick={() => onToggleExpand(item.id)}
            className="text-slate-400 hover:text-slate-200 text-xs w-4 shrink-0"
            aria-label={isExpanded ? 'フォルダを閉じる' : 'フォルダを開く'}
          >
            {isExpanded ? ICON_FOLDER_OPEN : ICON_FOLDER_CLOSED}
          </button>

          {/* フォルダ名（クリックで展開/折りたたみ） */}
          <button
            type="button"
            onClick={() => onToggleExpand(item.id)}
            className="flex items-center gap-2 flex-1 text-left text-sm font-medium text-slate-200 hover:text-white"
          >
            <span>{ICON_FOLDER}</span>
            <span>{item.title}</span>
          </button>

          {/* 操作ボタン */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-600 rounded transition-colors"
            >
              編集
            </button>
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => onShare(item)}
                  className="px-2 py-1 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-900/30 rounded transition-colors"
                >
                  共有
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                >
                  削除
                </button>
              </>
            )}
          </div>
        </div>

        {/* 子要素（展開時のみ表示） */}
        {isExpanded && item.children.length > 0 && (
          <ul>
            {item.children.map((child) => (
              <LinkTreeNode
                key={child.id}
                item={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onEdit={onEdit}
                onDelete={onDelete}
                onShare={onShare}
                currentUsername={currentUsername}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  /** LINK タイプ */
  return (
    <li>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-700/60 group ${indentClass}`}
      >
        <span className="w-4 shrink-0 text-xs text-transparent select-none">-</span>

        {/* リンク（別タブで開く） */}
        <a
          href={item.url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 flex-1 text-sm text-sky-400 hover:text-sky-300 hover:underline"
        >
          <span>{ICON_LINK}</span>
          <span>{item.title}</span>
          {item.description && (
            <span className="text-xs text-slate-500 ml-1">— {item.description}</span>
          )}
        </a>

        {/* 操作ボタン */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-600 rounded transition-colors"
          >
            編集
          </button>
          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => onShare(item)}
                className="px-2 py-1 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-900/30 rounded transition-colors"
              >
                共有
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
              >
                削除
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export default LinkTreeNode;
