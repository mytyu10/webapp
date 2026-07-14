- [2026-05-03] FullCalendarのテーマ上書きは`src/index.css`の`.calendar-wrapper`スコープ内でCSS変数を使って行う（`--fc-today-bg-color`等）。今日の日付ハイライトは紺ベースのUIで視認しやすい色（sky系の薄いオーバーレイ等）にし、黄色デフォルトを使わないこと
- [2026-07-05] `input[type="datetime-local"]` をダークテーマで使用する場合は Tailwind の `[color-scheme:dark]` ユーティリティクラスを付与すること。ブラウザネイティブの時刻ピッカー部分の文字色が判別しやすくなる
- [2026-07-12] FullCalendarのイベントブロック内テキスト色はダークテーマで黒になりやすいため、`.calendar-wrapper` に `--fc-event-text-color: rgb(255,255,255)` を設定し、`.fc-event-main`・`.fc-event-time`・`.fc-event-title`・`.fc-list-event-time` に `color: inherit` を付与すること。これにより個別イベントの `textColor`（インラインスタイル）が確実に継承される

- [2026-07-14] チャット機能のリアルタイム更新はWebSocket（Socket.io）ではなくポーリングで実装すること。WebSocketは不安定なため採用しない

### レスポンシブ・スマホ対応
