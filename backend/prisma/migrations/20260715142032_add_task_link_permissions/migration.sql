-- CreateTable
CREATE TABLE "TaskPermission" (
    "task_id" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "permission" TEXT NOT NULL,

    PRIMARY KEY ("task_id", "username"),
    CONSTRAINT "TaskPermission_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskPermission_username_fkey" FOREIGN KEY ("username") REFERENCES "Account" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LinkPermission" (
    "link_item_id" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "permission" TEXT NOT NULL,

    PRIMARY KEY ("link_item_id", "username"),
    CONSTRAINT "LinkPermission_link_item_id_fkey" FOREIGN KEY ("link_item_id") REFERENCES "LinkItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LinkPermission_username_fkey" FOREIGN KEY ("username") REFERENCES "Account" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TaskPermission_username_idx" ON "TaskPermission"("username");

-- CreateIndex
CREATE INDEX "LinkPermission_username_idx" ON "LinkPermission"("username");
