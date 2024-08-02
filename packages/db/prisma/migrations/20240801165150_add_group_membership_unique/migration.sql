/*
  Warnings:

  - A unique constraint covering the columns `[userId,groupId]` on the table `GroupMembership` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_userId_groupId_key" ON "GroupMembership"("userId", "groupId");
