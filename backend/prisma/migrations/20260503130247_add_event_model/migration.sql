-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "start_at" DATETIME NOT NULL,
    "end_at" DATETIME NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Event_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Account" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);
