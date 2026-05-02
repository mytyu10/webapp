import { Module } from '@nestjs/common';
import { TaskController } from '../controller/task.controller';
import { TaskService } from '../service/task.service';
import { TaskRepository } from '../repository/task.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerService } from 'src/common/service/logger.service';

/**
 * タスク管理モジュール
 */
@Module({
  controllers: [TaskController],
  providers: [TaskService, TaskRepository, PrismaService, LoggerService],
})
export class TaskModule {}
