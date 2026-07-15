/*
  Warnings:

  - You are about to drop the column `line_user_id` on the `Account` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "hashed_password" TEXT NOT NULL
);
INSERT INTO "new_Account" ("hashed_password", "username") SELECT "hashed_password", "username" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
