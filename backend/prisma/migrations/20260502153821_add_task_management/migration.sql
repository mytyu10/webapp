-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "due_date" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaskAssignee" (
    "task_id" INTEGER NOT NULL,
    "username" TEXT NOT NULL,

    PRIMARY KEY ("task_id", "username"),
    CONSTRAINT "TaskAssignee_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskAssignee_username_fkey" FOREIGN KEY ("username") REFERENCES "Account" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);
