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
│   │   ├── commit-agent.md
│   │   ├── incident-fix-agent.md      ← GitHub Issue バグ修正オーケストレーター
│   │   ├── incident-investigator-agent.md
│   │   ├── issue-reporter-agent.md
│   │   └── issue-updater-agent.md
│   ├── commands/              ← スキル定義ファイル（/スキル名 で呼び出す）
│   │   ├── implement.md        ← /implement スキル定義
│   │   └── commit.md           ← /commit スキル定義
│   ├── guidelines/
│   │   └── conventions.md     ← 開発規約（全エージェントが参照）
│   └── settings.json
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

### `/bug-fix` — GitHub Issue のバグ一括修正

`bug` ラベル付きの open Issue を修正する。承認ゲートなし・Issue ごとにブランチ + PR を作成し、調査結果と修正内容を Issue にコメントする。人間は PR レビュー時にまとめて確認する。

```
/bug-fix <Issue番号>
/bug-fix
```

**使用例**

```
/bug-fix 42          # Issue #42 を単体修正
/bug-fix #42         # 同上（# あり・なし両対応）
/bug-fix             # bug ラベル付き open Issue を全件修正
```

引数なしの場合、`bug` ラベル付きの open Issue を全件取得して順番に修正する（0件なら終了）。
修正ごとに PR を作成し、全件処理後に「修正済み: N件 / 失敗: M件」のサマリーを出力する。

#### `/bug-fix` の実行フロー（1件あたり）

```
1. Issue情報取得（gh issue view）
        ↓
2. fix/issue-<number>-<slug> ブランチ作成
        ↓
3. incident-investigator-agent
   └─ 根本原因・修正方針・関連ファイルを特定
        ↓
4. issue-updater-agent
   └─ Issue に調査結果をコメント + in-progress ラベル付与
        ↓
5. backend / frontend-generator-agent
   └─ 修正実装（バグ修正のみ・修正対象ファイルのみ）
        ↓
6. source-review-agent
   └─ レビュー（Critical/Major は自動差し戻し・最大2回）
        ↓
7. commit-agent
   └─ fix: #<number> でコミット
        ↓
8. gh pr create → PR作成（Closes #<number> 付き）
   issue-updater-agent → PR URL + 修正内容を Issue にコメント + in-review ラベル
        ↓
   完了報告（PR URL・コミットハッシュ）
```

**承認ゲートはなし。** PR レビューが人間による確認ポイントになる。

---

## GitHub Issue のバグを修正する（`incident-fix-agent`）

承認ゲートを挟みながら1件ずつ手動確認したい場合は `incident-fix-agent` に直接話しかける。

```
#42 のバグを直して
Issue 42 を修正して
```

こちらは承認ゲートあり・PR ではなく直接コミットする点が `/bug-fix` と異なる。

---

## エージェント一覧

エージェントはサブエージェントとして orchestrator-agent または bug-fix コマンドから委譲される。

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

【直接呼び出し】
  "Issue #42 を直して" ─── incident-fix-agent ─┬─ incident-investigator-agent
                                               ├─ backend/frontend-generator-agent
                                               ├─ source-review-agent
                                               ├─ commit-agent
                                               └─ issue-updater-agent
```

### 各エージェントの責務

| エージェント | 責務 | 出力先 |
|------------|------|--------|
| **orchestrator-agent** | /implement フロー制御・承認ゲート管理 | — |
| **incident-fix-agent** | GitHub Issue バグ修正フロー制御 | — |
| **plan-creator-agent** | 実装計画の作成 | `agent-work/results/YYYY-MM-DD-<機能名>-plan.md` |
| **plan-review-agent** | 計画をチェックリストで評価・判定 | `agent-work/results/YYYY-MM-DD-<機能名>-plan-review.md` |
| **incident-investigator-agent** | 障害の根本原因調査・レポート作成 | `agent-work/results/YYYY-MM-DD-incident-<number>.md` |
| **backend-generator-agent** | NestJS コードの生成・修正 | `agent-work/results/YYYY-MM-DD-<機能名>-backend.md` |
| **frontend-generator-agent** | React コードの生成・修正 | `agent-work/results/YYYY-MM-DD-<機能名>-frontend.md` |
| **test-agent** | Jest テストの生成と実行 | `agent-work/results/YYYY-MM-DD-<機能名>-test.md` |
| **source-review-agent** | コードの評価・問題報告（修正しない） | `agent-work/results/YYYY-MM-DD-<機能名>-source-review.md` |
| **design-updater-agent** | 実装内容を `detailed-design/` に反映 | `agent-work/results/YYYY-MM-DD-<機能名>-design-update.md` |
| **commit-agent** | git コミットの実行 | `agent-work/results/YYYY-MM-DD-<機能名>-commit.md` |
| **issue-reporter-agent** | GitHub Issue の自動起票（重複チェックあり） | — |
| **issue-updater-agent** | Issue へのコメント・ラベル操作・クローズ | — |

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

1. `.claude/commands/<名前>.md` を作成する
2. フロントマターに `name`, `description` を記載する
3. ユーザーが `/<名前>` で呼び出せるようになる

**フロントマターの例**

```markdown
---
name: my-skill
description: このスキルの用途の説明
---
```

