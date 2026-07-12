---
description: 機能追加・修正・リファクタリングの実装依頼を受け付け、orchestrator-agentに委譲して計画→レビュー→実装→テスト→コミットまでを完遂する。
allowed-tools: Agent
---

## Your task

$ARGUMENTS が空の場合は「何を実装しますか？」と確認すること。

orchestrator-agent に以下のフォーマットで委譲すること:

```
## ユーザーの依頼
$ARGUMENTS
```

## ステータスファイルについて

orchestrator-agent は各ステップ開始時に `/tmp/claude-current-agent.txt` を自動更新する。
自分でサブエージェントを呼び出すとこの更新がスキップされる。必ずオーケストレーター経由で実行すること。

## 実行フロー（orchestrator-agent 内部）

```
plan-creator-agent → plan-review-agent → 計画保存
→ backend-generator-agent（必要時）
→ frontend-generator-agent（必要時）
→ Prismaマイグレーション（DBスキーマ変更時）
→ test-agent → source-review-agent → design-updater-agent → commit-agent
```
