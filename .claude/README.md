# AI Agent

Claude Code を使った実装支援エージェントの定義・設定ファイル群。
スキル（`/implement`, `/commit`）を起点に、複数の専門サブエージェントが連携して計画作成からコミットまでを一貫して行う。

---

## ディレクトリ構成

```
webapp/
├── .claude/                   ← Claude Code 設定ホーム（このディレクトリ）
│   ├── README.md               ← このファイル
│   ├── agents/                ← エージェント定義ファイル
│   │   ├── orchestrator-agent.md
│   │   ├── plan-creator-agent.md
│   │   ├── plan-review-agent.md
│   │   ├── backend-generator-agent.md
│   │   ├── frontend-generator-agent.md
│   │   ├── test-agent.md
│   │   ├── source-review-agent.md
│   │   ├── design-updater-agent.md
│   │   └── commit-agent.md
│   ├── skills/                ← スキル定義ファイル
│   │   ├── implement.md        ← /implement スキル定義
│   │   └── commit.md           ← /commit スキル定義
│   ├── guidelines/
│   │   └── conventions.md     ← 開発規約（全エージェントが参照）
│   └── settings.json
│
├── ai-agent/                  ← Anthropic SDK アプリケーション
│   ├── src/
│   └── package.json
│
├── agent-work/                ← エージェント生成物（.gitignore 対象）
│   ├── plans/                 ← 承認済み実装計画の保存先
│   └── results/               ← 各エージェントの実行結果の保存先
│
├── backend/
├── frontend/
└── detailed-design/           ← アプリケーション詳細設計書
```

---

## スキルの使い方

スキルはユーザーが直接呼び出すエントリポイント。`/スキル名` で起動する。

### `/implement` — 機能実装

機能追加・修正・リファクタリングの依頼を受け付け、計画作成からコミットまでを一貫して実行する。

```
/implement <実装したい内容>
```

**使用例**

```
/implement ログアウト機能を追加して
/implement ユーザープロフィール編集画面を作って
/implement パスワード変更APIを実装して
```

各ステップの移行前にユーザーの承認を求める。承認しながら進めることで、意図しない実装を防ぐ。

---

### `/commit` — コミット

現在の git 変更を分析してコミットメッセージを自動生成し、コミットを実行する。
`/implement` のフロー内でも使われるが、手動実装後の単独コミットにも使える。

```
/commit
/commit <対象ファイルや補足>
```

**使用例**

```
/commit
/commit backend/src/account/ だけコミットして
```

`git push` は実行しない。push はユーザーが判断する。

---

## エージェント一覧

エージェントはサブエージェントとして orchestrator-agent から委譲される。ユーザーが直接呼ぶことは通常ない。

### 構成図

```
【スキル（ユーザー起動）】
  /implement ─── orchestrator-agent ─┬─ plan-creator-agent
  /commit ──────── commit-agent       ├─ plan-review-agent
                                      ├─ backend-generator-agent
                                      ├─ frontend-generator-agent
                                      ├─ test-agent
                                      ├─ source-review-agent
                                      ├─ design-updater-agent
                                      └─ commit-agent
```

### 各エージェントの責務

| エージェント | 責務 | 入力 | 出力先 |
|------------|------|------|--------|
| **orchestrator-agent** | フロー制御・承認ゲート管理。コードは書かない | ユーザーの依頼 | — |
| **plan-creator-agent** | ユーザーの依頼を分析し実装計画を作成 | 依頼内容 | `agent-work/results/YYYY-MM-DD-<機能名>-plan.md` |
| **plan-review-agent** | 計画をチェックリスト（15項目）で評価・判定 | 実装計画 | `agent-work/results/YYYY-MM-DD-<機能名>-plan-review.md` |
| **backend-generator-agent** | NestJS コードの生成・修正 | 実装ステップ一覧 | `agent-work/results/YYYY-MM-DD-<機能名>-backend.md` |
| **frontend-generator-agent** | React コードの生成・修正 | 実装ステップ一覧 | `agent-work/results/YYYY-MM-DD-<機能名>-frontend.md` |
| **test-agent** | Jest テストの生成と実行 | 実装ファイル一覧 | `agent-work/results/YYYY-MM-DD-<機能名>-test.md` |
| **source-review-agent** | コードの評価・問題報告（修正しない） | 実装ファイル一覧 | `agent-work/results/YYYY-MM-DD-<機能名>-source-review.md` |
| **design-updater-agent** | 実装内容を `detailed-design/` に反映 | 実装済みファイル一覧 | `agent-work/results/YYYY-MM-DD-<機能名>-design-update.md` |
| **commit-agent** | git コミットの実行 | コミット対象ファイル一覧 | `agent-work/results/YYYY-MM-DD-<機能名>-commit.md` |

---

## `/implement` の実行フロー詳細

```
1. plan-creator-agent
   └─ コードベースを調査し実装計画を作成（backend/frontend/DBスキーマ変更の有無を明示）
        ↓ [ユーザー承認]
2. plan-review-agent
   └─ 15項目のチェックリストで計画を評価
      NG あり → plan-creator-agent へ差し戻し（1へ）
      全項目 OK → 承認
        ↓ [ユーザー承認]
3. 計画を agent-work/plans/ に保存
        ↓ [ユーザー承認]
4a. backend-generator-agent（バックエンドがある場合）
4b. frontend-generator-agent（フロントエンドがある場合）
        ↓ [ユーザー承認]
5. Prisma マイグレーション実行（DBスキーマ変更がある場合のみ）
        ↓ [ユーザー承認]
6. test-agent
   └─ Jest テストを生成して実行。失敗が続く場合はユーザーへ報告
        ↓ [ユーザー承認]
7. source-review-agent
   └─ 問題一覧を報告（修正はしない）
      問題あり → backend/frontend-generator-agent へ差し戻し（最大2回）→ 6 へ
      問題なし → 次へ
        ↓ [ユーザー承認]
8. design-updater-agent
   └─ 実装内容を detailed-design/ の対応する設計書に反映
        ↓ [ユーザー承認]
9. commit-agent
   └─ 変更ファイルをステージングしてコミット（push はしない）
        ↓
10. 完了報告（実装ファイル一覧・コミットハッシュ・残作業）
```

---

## 開発規約

`.claude/guidelines/conventions.md` に全エージェントが参照する開発規約を定義している。
コードを生成・修正する際は、エージェントが自動的にこのファイルを読み込む。

会話の中でユーザーがスタイル・設計の修正を指摘した場合、規約ファイルは自動更新される（Stop フックによる自動化）。

---

## エージェント・スキルの追加方法

### エージェントを追加する

1. `.claude/agents/<名前>-agent.md` を作成する
2. フロントマターに `name`, `description`, `model`, `color`, `tools` を記載する
3. Claude Code が自動的に認識する（シンボリックリンク不要）

**フロントマターの例**

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

1. `.claude/skills/<名前>.md` を作成する
2. フロントマターに `name`, `description` を記載する
3. ユーザーが `/<名前>` で呼び出せるようになる

**フロントマターの例**

```markdown
---
name: my-skill
description: このスキルの用途の説明
---
```

