-- CreateIndex
CREATE INDEX "ChatMessage_from_user_idx" ON "ChatMessage"("from_user");

-- CreateIndex
CREATE INDEX "ChatMessage_to_user_idx" ON "ChatMessage"("to_user");

-- CreateIndex
CREATE INDEX "ChatMessage_created_at_idx" ON "ChatMessage"("created_at");

-- CreateIndex
CREATE INDEX "Event_created_by_idx" ON "Event"("created_by");

-- CreateIndex
CREATE INDEX "Event_start_at_idx" ON "Event"("start_at");

-- CreateIndex
CREATE INDEX "LinkItem_created_by_idx" ON "LinkItem"("created_by");

-- CreateIndex
CREATE INDEX "LinkItem_parent_id_idx" ON "LinkItem"("parent_id");

-- CreateIndex
CREATE INDEX "Task_created_by_idx" ON "Task"("created_by");

-- CreateIndex
CREATE INDEX "Task_parent_id_idx" ON "Task"("parent_id");

-- CreateIndex
CREATE INDEX "Task_due_date_idx" ON "Task"("due_date");

-- CreateIndex
CREATE INDEX "TaskAssignee_username_idx" ON "TaskAssignee"("username");
