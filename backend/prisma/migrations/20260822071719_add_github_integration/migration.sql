-- CreateTable
CREATE TABLE "GitHubToken" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "access_token" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "GitHubToken_username_fkey" FOREIGN KEY ("username") REFERENCES "Account" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GitHubRepository" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GitHubRepository_username_fkey" FOREIGN KEY ("username") REFERENCES "Account" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GitHubRepository_username_idx" ON "GitHubRepository"("username");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubRepository_username_owner_repo_key" ON "GitHubRepository"("username", "owner", "repo");
