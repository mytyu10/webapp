# 機能名
LINE通知機能

# DBスキーマ変更
あり

# 実装ステップ一覧（バックエンド）

1. パッケージインストール確認・追加（axios, @nestjs/schedule）
2. Prismaスキーマ変更（Account.line_user_id, TaskNotificationモデル新規, Task.notifications）
3. マイグレーション実行
4. message.ts にLINE関連メッセージ追加
5. Accounts DTO追加（LineCallbackDto, AccountMeResponseDto）
6. Accounts Repository更新（updateLineUserId）
7. Accounts Service更新（getLineLoginUrl, handleLineCallback, getMe）
8. Accounts Controller更新（3エンドポイント追加）
9. TaskNotification DTO追加（CreateNotificationDto等, TaskResponseDtoにnotifications追加）
10. TaskNotification Repository追加（5メソッド）
11. TaskNotification Service追加
12. LineNotification Service追加（@Cron 1分ごと）
13. Tasks Controller更新（3エンドポイント追加）
14. AppModule更新（ScheduleModule.forRoot()）
15. 環境変数追加（backend/.env）

# 実装ステップ一覧（フロントエンド）

1. API関数追加（taskApi.ts）
2. 型定義追加（TaskNotification型, Task型にnotifications追加）
3. LineCallbackPage新規作成
4. App.tsxにルート追加（/line-callback）
5. Sidebar.tsx更新（LINE連携ボタン）
6. useTaskForm.ts更新（通知日時ステート追加）
7. taskValidation.ts更新（担当者必須化）
8. TaskFormPage.tsx更新（通知日時追加UI）
9. TaskDetailPanel.tsx更新（通知一覧・削除ボタン）

# 注意事項・リスク

- TaskNotificationリレーションにonDelete: Cascade明示
- Cronエラーハンドリング（送信失敗時はis_sent=falseのまま）
- /line-callback はPrivateRoute外に配置
- 担当者必須化の既存テスト影響に注意
- LINE OAuth のリダイレクトURI登録済みであること
