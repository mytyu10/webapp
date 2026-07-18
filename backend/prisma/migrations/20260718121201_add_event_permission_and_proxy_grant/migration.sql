-- CreateTable
CREATE TABLE "EventPermission" (
    "event_id" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "permission" TEXT NOT NULL,

    PRIMARY KEY ("event_id", "username"),
    CONSTRAINT "EventPermission_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventPermission_username_fkey" FOREIGN KEY ("username") REFERENCES "Account" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventProxyGrant" (
    "granter_username" TEXT NOT NULL,
    "grantee_username" TEXT NOT NULL,

    PRIMARY KEY ("granter_username", "grantee_username"),
    CONSTRAINT "EventProxyGrant_granter_username_fkey" FOREIGN KEY ("granter_username") REFERENCES "Account" ("username") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventProxyGrant_grantee_username_fkey" FOREIGN KEY ("grantee_username") REFERENCES "Account" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EventPermission_username_idx" ON "EventPermission"("username");

-- CreateIndex
CREATE INDEX "EventProxyGrant_grantee_username_idx" ON "EventProxyGrant"("grantee_username");
