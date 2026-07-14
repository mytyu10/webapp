# チャット WebSocket 移行 実装計画

- 日付: 2026-07-14
- ステータス: 承認済み

## 依頼内容

現在3秒ポーリングで実装されているチャット機能を WebSocket（Socket.io）に移行してリアルタイム通信に変更する。

## 実装計画

### DBスキーマ変更
なし（既存 ChatMessage テーブルをそのまま利用）

### バックエンド実装ステップ

1. パッケージインストール: `@nestjs/websockets @nestjs/platform-socket.io socket.io`
2. `src/chat/gateway/chat.gateway.ts` — WebSocket Gateway 新規作成
   - namespace `/chat` で Gateway 定義
   - `handleConnection` で JWT 検証・無効なら切断
   - `join` イベント: ユーザーのルーム `user:<username>` に参加
   - `send_message` イベント: DBに保存し、送受信者両方のルームに `receive_message` をemit
3. `src/chat/gateway/ws-jwt.guard.ts` — WebSocket用JWTガード
   - `client.handshake.auth.token` からJWT取得・検証
   - `client.data.user` に JwtPayload をセット
4. `src/chat/chat.module.ts` — ChatGateway を providers に追加

### フロントエンド実装ステップ

1. パッケージインストール: `socket.io-client`
2. `src/socket/chatSocket.ts` — ソケット管理モジュール新規作成
   - シングルトンソケット生成ファクトリ
   - JWT を `auth: { token }` に付与
3. `src/hooks/useChat.ts` — ポーリングを Socket.io に置き換え
   - `setInterval` / ポーリングを削除
   - 接続・`receive_message` イベント受信・`send_message` emit に変更
   - 初期ロードは REST API（GET /chat/messages）を継続使用
   - 送信後の `fetchContacts` は引き続き REST で実行
4. `src/api/chatApi.ts` — 既存の全関数を維持（後方互換性確保）

### 実装方針

- 認証: 接続時に `handshake.auth.token` でJWT検証
- ルーム設計: `user:<username>` で各ユーザーが自分のルームを持つ
- 初期メッセージ: REST API で取得、以降はWebSocketでリアルタイム受信
- 既存REST API: 全て残す（GET /chat/messages, POST /chat/messages 等）
- 自分の送信メッセージも `receive_message` で受け取り画面に表示

## レビュー結果

- 既存アーキテクチャ（Controller → Service → Repository → Prisma）に準拠
- JWT認証は接続時と各イベントハンドラで適用
- DBスキーマ変更なし
- 既存REST APIは全て維持
- リスク: useEffect クリーンアップでソケット切断を確実に実施すること
