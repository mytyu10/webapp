import { Module } from '@nestjs/common';
import { TaskController } from '../controller/task.controller';
import { TaskService } from '../service/task.service';
import { TaskRepository } from '../repository/task.repository';
import { TaskNotificationService } from '../service/task-notification.service';
import { TaskNotificationRepository } from '../repository/task-notification.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonModule } from 'src/common/common.module';

/**
 * タスク管理モジュール
 */
@Module({
  imports: [CommonModule],
  controllers: [TaskController],
  providers: [
    TaskService,
    TaskRepository,
    TaskNotificationService,
    TaskNotificationRepository,
    PrismaService,
  ],
  exports: [TaskNotificationRepository],
})
export class TaskModule {}
