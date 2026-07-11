- [2026-05-03] FullCalendarのテーマ上書きは`src/index.css`の`.calendar-wrapper`スコープ内でCSS変数を使って行う（`--fc-today-bg-color`等）。今日の日付ハイライトは紺ベースのUIで視認しやすい色（sky系の薄いオーバーレイ等）にし、黄色デフォルトを使わないこと
- [2026-07-05] `input[type="datetime-local"]` をダークテーマで使用する場合は Tailwind の `[color-scheme:dark]` ユーティリティクラスを付与すること。ブラウザネイティブの時刻ピッカー部分の文字色が判別しやすくなる

### レスポンシブ・スマホ対応