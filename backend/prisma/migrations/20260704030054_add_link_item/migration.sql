-- CreateTable
CREATE TABLE "LinkItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "parent_id" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "LinkItem_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Account" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LinkItem_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "LinkItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
