#!/bin/bash
# Stop hook: 会話中のコーディング規約への指摘を ai-agent/docs/conventions.md に自動反映する

input=$(cat)
transcript=$(echo "$input" | jq -r '.transcript_path // empty')

[ -z "$transcript" ] || [ ! -f "$transcript" ] && exit 0

cd /Users/yuto/workspace/webapp

recent=$(tail -c 8000 "$transcript" 2>/dev/null)
[ -z "$recent" ] && exit 0

echo "$recent" | claude -p "以下はClaude Codeセッションのトランスクリプト（JSONL形式）です。
ユーザーがコーディングスタイル・設計・技術的な規約について具体的に指摘・修正した箇所があれば、ai-agent/docs/conventions.md の適切なセクションを更新してください。
明確な規約変更がなければ何もしないでください。
変更した場合は変更内容を1行で出力し、変更しない場合は何も出力しないでください。" \
  --allowedTools "Read,Edit" \
  2>/dev/null || true
