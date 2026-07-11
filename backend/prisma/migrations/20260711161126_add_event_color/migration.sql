/*
  Warnings:

  - You are about to drop the column `repeat_group_id` on the `LinkItem` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "start_at" DATETIME NOT NULL,
    "end_at" DATETIME NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'cyan',
    "repeat_group_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Event_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Account" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("created_at", "created_by", "description", "end_at", "id", "repeat_group_id", "start_at", "title", "updated_at") SELECT "created_at", "created_by", "description", "end_at", "id", "repeat_group_id", "start_at", "title", "updated_at" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE TABLE "new_LinkItem" (
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
INSERT INTO "new_LinkItem" ("created_at", "created_by", "description", "id", "order", "parent_id", "title", "type", "updated_at", "url") SELECT "created_at", "created_by", "description", "id", "order", "parent_id", "title", "type", "updated_at", "url" FROM "LinkItem";
DROP TABLE "LinkItem";
ALTER TABLE "new_LinkItem" RENAME TO "LinkItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
