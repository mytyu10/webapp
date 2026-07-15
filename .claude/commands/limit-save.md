---
description: 現在の作業状況をファイルに保存し、limit 解除後に再開できるようにする。orchestrator-agent でフローを実行中に limit が近づいたタイミングで呼ぶ。
allowed-tools: Agent
---

## Context

現在の orchestrator-agent のステータス: !`cat /tmp/claude-current-agent.txt 2>/dev/null || echo "不明"`

## Your task

$ARGUMENTS が空の場合は「現在の作業状況を教えてください（例: plan-creator が完了、次は backend-generator）」と確認すること。

limit-save-agent に以下のフォーマットで委譲すること:

```
## 現在の作業状況
$ARGUMENTS

## 元の依頼
（agent-work/plans/ の最新ファイルまたは /tmp/claude-current-agent.txt から取得してください）
```

limit-save-agent が行うこと:
1. `/tmp/claude-current-agent.txt` と `agent-work/` から現在の状態を収集する
2. `agent-work/limit-context/YYYY-MM-DD-HH-MM-<作業名>.md` に状況を保存する
3. `agent-work/limit-context/latest.txt` に最新ファイルのパスを書き込む
4. 保存結果と limit 解除後の再開方法をユーザーに案内する
