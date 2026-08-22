-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "due_date" DATETIME,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "parent_id" INTEGER,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "closed_by" TEXT,
    CONSTRAINT "Task_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Account" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("category", "closed_by", "created_at", "created_by", "description", "due_date", "id", "is_completed", "parent_id", "priority", "title", "updated_at") SELECT "category", "closed_by", "created_at", "created_by", "description", "due_date", "id", "is_completed", "parent_id", "priority", "title", "updated_at" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_created_by_idx" ON "Task"("created_by");
CREATE INDEX "Task_parent_id_idx" ON "Task"("parent_id");
CREATE INDEX "Task_due_date_idx" ON "Task"("due_date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
