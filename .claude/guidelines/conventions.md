- [2026-05-03] FullCalendarのテーマ上書きは`src/index.css`の`.calendar-wrapper`スコープ内でCSS変数を使って行う（`--fc-today-bg-color`等）。今日の日付ハイライトは紺ベースのUIで視認しやすい色（sky系の薄いオーバーレイ等）にし、黄色デフォルトを使わないこと
- [2026-07-05] `input[type="datetime-local"]` をダークテーマで使用する場合は Tailwind の `[color-scheme:dark]` ユーティリティクラスを付与すること。ブラウザネイティブの時刻ピッカー部分の文字色が判別しやすくなる
- [2026-07-12] FullCalendarのイベントブロック内テキスト色はダークテーマで黒になりやすいため、`.calendar-wrapper` に `--fc-event-text-color: rgb(255,255,255)` を設定し、`.fc-event-main`・`.fc-event-time`・`.fc-event-title`・`.fc-list-event-time` に `color: inherit` を付与すること。これにより個別イベントの `textColor`（インラインスタイル）が確実に継承される

- [2026-07-14] チャット機能のリアルタイム更新はWebSocket（Socket.io）ではなくポーリングで実装すること。WebSocketは不安定なため採用しない

### TypeScript・React型付け

- [2026-08-22] `React.FormEvent` には必ず型パラメーターを付与すること（例: `React.FormEvent<HTMLFormElement>`）。型パラメーターの省略は TypeScript の型警告を引き起こす

### DTO・バリデーション

- [2026-08-22] DTOの `Record<string, unknown>` 型フィールドには必ず `@IsObject()` デコレータを付与すること（class-validatorによるバリデーションが効かなくなるため省略不可）

### 認可（Authorization）

- [2026-07-15] リソースのオーナーシップチェック（更新・削除時の作成者確認）はサービス層に直接書かず、`OwnershipGuard` + `@CheckOwnership('task' | 'event' | 'link')` デコレータで宣言的に実装すること。サービス層に `if (resource.created_by !== username) throw new ForbiddenException(...)` を追加してはいけない
- [2026-07-15] タスク・リンクへの権限共有（READ/WRITE）は `TaskPermission` / `LinkPermission` テーブルで管理する。一覧取得APIは「自分が作成したもの」または「自分に権限が付与されたもの」を返すORクエリにすること
- [2026-07-15] 新しいリソースに認可チェックを追加する場合は `OwnershipGuard` を拡張し、`common/guards/ownership.guard.ts` に対応リソースの取得ロジックを追記すること。新たなガードファイルを作らない

### ファイル設計・責務分割

- [2026-07-16] コンポーネント・フック・サービスは200行を超えたら分割を検討すること。複数の独立した関心事が1ファイルに混在していないか確認する
- [2026-07-16] Reactコンポーネントが複数のフォームモードを持つ場合（例: 通常/複数日付/繰り返し）、各モードは独立したコンポーネントファイルに分割し、親コンポーネントはモード切り替えと共通状態の管理のみを担うこと
- [2026-07-16] 再帰的なUIコンポーネント（ツリー表示など）は独立ファイルに抽出すること。ページコンポーネントにインラインで定義しない
- [2026-07-16] メッセージ定数（message.ts）・型定義・バリデーション関数はドメイン（task/event/link等）ごとに分けることを検討すること。単一ファイルへの集約は規模が大きくなると保守性が低下する

### GitHub Issue・エージェントフロー

- [2026-08-22] バグ修正フロー（bug-fix-agent / incident-fix-agent）において、調査結果・レビュー結果・テスト結果は既存のIssueにコメントとして追記すること。新しい調査用Issueを別途起票してはいけない
- [2026-08-22] 規約（conventions.md）および CLAUDE.md への追記は1〜3行以内に収め、最小限の変更に留めること

### レスポンシブ・スマホ対応

- [2026-07-18] サイドバーのトグルボタンはレイアウト親コンポーネント（`SidebarLayout.tsx`）に `fixed` 配置せず、`Sidebar.tsx` の内部に配置すること。`fixed` 配置はモーダルやカレンダーなど他のコンポーネントと重なる原因になる。サイドバーが閉じた状態でもボタンが見えるよう、最小幅（`sm:w-8` 等）を確保すること
