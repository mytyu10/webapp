---
description: /limit-save で保存した作業状況を読み込み、orchestrator-agent 経由で作業を再開する。limit 解除後の新しいセッションで呼ぶ。/loop と組み合わせて自動ポーリングも可能（例: /loop 30m /limit-resume）。
allowed-tools: Agent
---

## Your task

limit-resume-agent に以下のフォーマットで委譲すること:

```
## 再開依頼
保存された最新のコンテキストを読み込んで作業を再開してください。

## 補足
$ARGUMENTS
```

limit-resume-agent が行うこと:
1. `agent-work/limit-context/latest.txt` から最新のコンテキストファイルパスを取得する
2. コンテキストファイルを読み込み、元の依頼・完了済みステップ・次のステップを把握する
3. ユーザーに再開内容を提示して承認を得る
4. orchestrator-agent に委譲して中断ポイントから作業を継続する
5. 完了後に `latest.txt` を削除してクリーンアップする

## 自動ポーリングで再開したい場合

limit 解除のタイミングが不明な場合は、新しいセッションで以下を実行すると 30 分ごとに再開を試みます:

```
/loop 30m /limit-resume
```

再開が成功したら Esc キーで loop を停止してください。
