---
description: 現在の変更をgitコミットする。commit-agentに委譲してコミットメッセージの自動生成からコミットまでを完遂する。
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Agent
---

## Context

- Current git status: !`git status`
- Recent commits: !`git log --oneline -5`

## Your task

commit-agent に以下のフォーマットで委譲すること:

```
## コミット対象
$ARGUMENTS が指定されている場合はその内容。なければ git status で確認して判断する。

## 補足
ユーザーからの追加指示があれば記載。
```

commit-agent が行うこと:
1. `git status` で変更ファイルを確認する
2. `git diff` で変更内容を確認する
3. `git log --oneline -5` でコミットスタイルを確認する
4. コミットメッセージを作成する（日本語）
5. 対象ファイルを個別にステージングしてコミットする

制約:
- `git push` は実行しない
- `.env`・`node_modules`・ビルド成果物はコミットしない
- 複数の関心事に跨る変更は分割してコミットする
