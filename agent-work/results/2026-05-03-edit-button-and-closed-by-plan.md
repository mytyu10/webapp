# 実装計画: 編集ボタン常時表示・クローズユーザー記録

- 日付: 2026-05-03

## ユーザーの依頼

1. タスク画面（TaskDetailPage・TaskListPage）の編集ボタンを、ログインユーザーに関わらず常に表示する（現在は作成者のみ表示）
2. 誰がタスクをクローズ（完了）したかをDBに保存し、完了済みタスクにはクローズした人のユーザー名を表示する

## 実装計画

```
【実装計画】
機能名: 編集ボタン常時表示・クローズユーザー記録
DBスキーマ変更: あり

影響範囲:
- バックエンド: あり
- フロントエンド: あり

バックエンド実装ステップ:

1. backend/prisma/schema.prisma — Taskモデルに `closed_by String?` フィールドを追加（修正）
   - `is_completed Boolean @default(false)` の直後に追記
   - closed_byはnullable（未完了時はnull）

2. DBマイグレーション実行（手順）
   - backend/ ディレクトリで以下を実行:
     npx prisma migrate dev --name add_closed_by_to_task
   - 既存レコードのclosed_byはすべてnullになる（nullable列のため安全）

3. backend/src/tasks/dto/task.dto.ts — DTOに closed_by フィールドを追加（修正）
   - UpdateTaskDto に closed_by フィールドは追加しない（サーバー側で自動設定するため）
   - TaskResponseDto（interface）に `closed_by: string | null` を追加

4. backend/src/jwt/jwt-auth.guard.ts — JWTデコード結果をリクエストオブジェクトに付与（修正）
   - `jwt.verify()` の戻り値を `request.user` に設定する
   - 型: `request.user = jwt.verify(token, ...) as JwtPayload`
   - NestJSのRequestオブジェクト型を拡張するため、`Express.Request` の型宣言が必要な場合は
     `backend/src/types/express.d.ts` を新規作成して `user?: JwtPayload` を宣言する

5. backend/src/types/express.d.ts — Expressリクエスト型拡張（新規）
   - `declare namespace Express { interface Request { user?: import('../jwt/jwt.payload').JwtPayload } }`
   - JwtAuthGuardでverify結果をrequest.userに代入するために必要

6. backend/src/tasks/controller/task.controller.ts — updateエンドポイントにユーザー情報を渡す（修正）
   - `@Patch(':id')` の update メソッドに `@Req() req: Request` を追加
   - `req.user.username` を取得してServiceの update に渡す
   - メソッドシグネチャ: `async update(@Param('id', ParseIntPipe) id: number, @Body(ValidationPipe) dto: UpdateTaskDto, @Req() req: Request, @Res() response: Response)`
   - Serviceの呼び出し: `this.taskService.update(id, dto, req.user!.username)`

7. backend/src/tasks/service/task.service.ts — closed_by ロジックを update メソッドに追加（修正）
   - update メソッドのシグネチャに `requestUsername: string` 引数を追加
   - is_completed が true になる場合: `closed_by = requestUsername`
   - is_completed が false になる場合: `closed_by = null`
   - is_completed の変更がない場合: closed_by を変更しない（Repositoryに渡さない）
   - toResponseDto で `closed_by: task.closed_by` をマッピングに追加

8. backend/src/tasks/repository/task.repository.ts — closed_by フィールドをupdate・findAll・findById・createに対応（修正）
   - update メソッドの data 引数型に `closed_by?: string | null` を追加
   - update メソッド内の Prisma update data に `...(data.closed_by !== undefined && { closed_by: data.closed_by })` を追加
   - ※ create は closed_by を含まない（新規作成時は常にnull）
   - ※ findAll・findById は Prisma の include ではなく select を使っていないため、スキーマに closed_by が追加されれば自動的に返却される（変更不要）

フロントエンド実装ステップ:

1. frontend/src/api/taskApi.ts — Task インターフェースに closed_by を追加（修正）
   - `Task` インターフェースに `closed_by: string | null` フィールドを追加

2. frontend/src/components/TaskCard.tsx — 編集ボタンの isOwner 条件を削除・closed_by 表示追加（修正）
   - Props の `isOwner: boolean` を削除
   - 編集ボタンの `{isOwner && (...)}` ガードを外し、常に表示
   - 削除ボタンのみ引き続き isOwner で制御する（依頼に削除ボタン変更の記述はないため現状維持）
   - 完了済みカードに `closed_by` を表示: `{isCompleted && node.closed_by && <span>クローズ: {node.closed_by}</span>}` を期限・担当者行の下に追加

3. frontend/src/pages/TaskListPage.tsx — renderTaskCard の isOwner 渡し方を修正（修正）
   - `isOwner` の計算と TaskCard への渡しはそのままにする（削除ボタン制御のため isOwner は維持）
   - 編集ボタンは TaskCard 側で常時表示になるため、TaskListPage 側の変更は不要

4. frontend/src/pages/TaskDetailPage.tsx — 編集ボタン表示条件削除・closed_by 表示追加（修正）
   - `isOwner` 定数は削除ボタンがないため不要 → 削除
   - 編集ボタンの `{isOwner && (...)}` ガードを外し、常に表示
   - 完了済みバナー部分に closed_by を追加表示:
     現在: `<span className="text-green-400 text-sm font-medium">完了済み</span>`
     変更後: バナーに `{task.closed_by && <span className="text-green-300 text-sm">（クローズ: {task.closed_by}）</span>}` を追加

注意事項:
- JwtAuthGuardでrequest.userへの代入は型安全にするため、express.d.tsでExpressの型宣言拡張が必要
- TaskCard の isOwner Props は削除ボタンの制御のために引き続き使用する。削除ボタンは引き続き作成者のみ表示
- closed_byのセット条件は「is_completedが変化するとき」のみ。フィールド変更なしでPATCHが来た場合はclosed_byは変更しない
- is_completed: false から false への更新（変化なし）の場合は closed_by に触れない
- is_completed: true から true への更新（変化なし）の場合も closed_by に触れない
- Serviceのupdate内で既存タスクを取得後に is_completed の変化を判定する（既に existing を取得済みのため追加コスト最小）
- マイグレーション後は `npx prisma generate` も実行してPrismaクライアントを再生成すること（migrate devは自動でgenerateも実行するため通常は不要だが念のため確認）
- conventions.md の「アクセス制御」セクション（`編集・削除ボタンは作成者のみ表示`）は今回の変更で編集ボタンに関しては記述が変わるため、実装完了後に更新が必要
```

## ユーザーへの確認事項

なし（依頼内容が明確だったため計画作成に進んだ）
