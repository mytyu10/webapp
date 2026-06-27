-- AlterTable
ALTER TABLE "Account" ADD COLUMN "line_user_id" TEXT;

-- CreateTable
CREATE TABLE "TaskNotification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "task_id" INTEGER NOT NULL,
    "notify_at" DATETIME NOT NULL,
    "is_sent" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TaskNotification_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
