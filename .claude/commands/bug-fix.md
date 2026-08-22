---
description: bug ラベルの open な GitHub Issue を修正する。Issue番号を指定すれば単体修正、指定なしなら全 open Issue をスキャンして順番に自動修正する。承認ゲートなし・PR作成・Issueへの調査結果コメントまでを一貫して行う。
allowed-tools: Bash(gh issue list:*), Bash(gh issue view:*), Agent
---

## Context

- 現在のブランチ: !`git branch --show-current`

## Your task

### 引数ありの場合（Issue番号が指定されている）

`$ARGUMENTS` から `#` を除いて数値のみを取得し、bug-fix-agent に委譲する:

```
## Issue番号
<number>
```

### 引数なしの場合（一括修正モード）

**Step 1: bug ラベル付き open Issue を取得する**

```bash
gh issue list --label bug --state open --json number,title --limit 100
```

0件の場合は「修正対象の Issue がありません（bug ラベル付き open Issue なし）」と報告して終了する。

**Step 2: 一覧を表示して修正を開始する**

```
## 修正対象 Issue（N件）

| # | タイトル |
|---|---------|
| #<number> | <title> |
...

順番に修正を開始します。
```

**Step 3: 各 Issue を順番に bug-fix-agent へ委譲する**

Issue を番号昇順に1件ずつ bug-fix-agent に委譲する:

```
## Issue番号
<number>
```

1件完了するたびに進捗を報告する:
```
Issue #<number>（<title>）の処理が完了しました。（<done>/<N>）
```

bug-fix-agent がエラーを返した場合はスキップして次へ進む。

**Step 4: 全件処理後にサマリーを出力する**

```
## /bug-fix 完了

修正済み: N件
- #<number> <title> → PR <URL>
...

失敗 / スキップ: M件
- #<number> <title> → <理由>
...
```
