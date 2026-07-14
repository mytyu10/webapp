-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from_user" TEXT NOT NULL,
    "to_user" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_from_user_fkey" FOREIGN KEY ("from_user") REFERENCES "Account" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_to_user_fkey" FOREIGN KEY ("to_user") REFERENCES "Account" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);
