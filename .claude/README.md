# AI Agent

Claude Code を使った実装支援エージェントの定義・設定ファイル群。
スキル（`/implement`, `/commit`）を起点に、複数の専門サブエージェントが連携して計画作成からコミットまでを一貫して行う。

---

## 現在のエージェント・スキルを確認する

```bash
# エージェント一覧
ls .claude/agents/

# スキル一覧
ls .claude/commands/

# エージェントの責務を確認（description フィールド）
head -10 .claude/agents/<名前>-agent.md
```

---

## スキルの使い方

スキルはユーザーが直接呼び出すエントリポイント。`/スキル名` で起動する。

### `/implement` — 機能実装

機能追加・修正・リファクタリングの依頼を受け付け、計画作成からコミットまでを一貫して実行する。

```
/implement <実装したい内容>
```

各ステップの移行前にユーザーの承認を求める。

#### 実行フロー

```
1. plan-creator-agent    — コードベースを調査し実装計画を作成
       ↓ [ユーザー承認]
2. plan-review-agent     — チェックリストで計画を評価。NG → 差し戻し
       ↓ [ユーザー承認]
3. 計画を agent-work/plans/ に保存
       ↓ [ユーザー承認]
4. backend-generator-agent / frontend-generator-agent（必要な方のみ）
       ↓ [ユーザー承認]
5. Prisma マイグレーション実行（DBスキーマ変更がある場合のみ）
       ↓ [ユーザー承認]
6. test-agent            — Jest テストを生成して実行
       ↓ [ユーザー承認]
7. source-review-agent   — 問題報告（修正はしない）。問題あり → 差し戻し（最大2回）
       ↓ [ユーザー承認]
8. design-updater-agent  — detailed-design/ の対応する設計書に反映
       ↓ [ユーザー承認]
9. commit-agent          — コミット（push はしない）
       ↓
10. 完了報告
```

---

### `/commit` — コミット

現在の git 変更を分析してコミットメッセージを自動生成し、コミットを実行する。

```
/commit
/commit <対象ファイルや補足>
```

`git push` は実行しない。push はユーザーが判断する。

---

### `/bug-fix` — GitHub Issue のバグ一括修正

`bug` ラベル付きの open Issue を修正する。承認ゲートなし・Issue ごとにブランチ + PR を作成し、調査結果と修正内容を既存 Issue にコメントする。

```
/bug-fix <Issue番号>   # 単体修正
/bug-fix               # bug ラベル付き open Issue を全件修正
```

#### 実行フロー（1件あたり）

```
1. Issue 情報取得
2. fix/issue-<number>-<slug> ブランチ作成
3. incident-investigator-agent  — 根本原因・修正方針を特定
4. issue-updater-agent          — 調査結果を Issue にコメント + in-progress ラベル
5. backend / frontend-generator-agent  — 修正実装
6. source-review-agent          — レビュー（Critical/Major は自動差し戻し・最大2回）
7. commit-agent                 — fix: #<number> でコミット
8. PR 作成 + Issue に PR URL をコメント + in-review ラベル
```

承認ゲートなし。PR レビューが人間による確認ポイント。

---

## エージェント・スキルの追加方法

### エージェントを追加する

1. `.claude/agents/<名前>-agent.md` を作成する
2. フロントマターに `name`, `description`, `model`, `color`, `tools` を記載する
3. Claude Code が自動的に認識する

```markdown
---
name: my-agent
description: >
  このエージェントの用途（いつ呼ぶかを含めて記載する）
model: sonnet
color: blue
tools: Read, Grep, Glob, Write
---
```

### スキルを追加する

1. `.claude/commands/<名前>.md` を作成する
2. フロントマターに `name`, `description` を記載する
3. ユーザーが `/<名前>` で呼び出せるようになる

```markdown
---
name: my-skill
description: このスキルの用途の説明
---
```

---

## 開発規約

`.claude/guidelines/conventions.md` に全エージェントが参照する開発規約を定義している。
会話の中でスタイル・設計の修正を指摘した場合、規約ファイルは自動更新される。
