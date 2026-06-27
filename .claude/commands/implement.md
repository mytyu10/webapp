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

## 重要: 承認ゲートの中継ルール

orchestrator-agent は各ステップで承認ゲートを設けて一時停止し、以下の形式のメッセージを返してくる:
```
次の <エージェント名> サブエージェントに進みますか？
```

このメッセージを受け取ったら:
1. **ユーザーにそのまま中継してユーザーの返答を待つ**
2. ユーザーが承認したら **SendMessage（to: <agentId>）でオーケストレーターに返答を送る**
3. **自分でサブエージェントを直接呼び出してはならない**（ステータスファイルが更新されなくなり、承認フェーズが崩壊する）

orchestrator-agent の agentId は最初の Agent 呼び出し結果に含まれる。以降のすべての承認応答は同一の agentId に SendMessage で送ること。

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
