import { Module } from '@nestjs/common';
import { TaskController } from '../controller/task.controller';
import { TaskService } from '../service/task.service';
import { TaskRepository } from '../repository/task.repository';
import { TaskPermissionService } from '../service/task-permission.service';
import { TaskPermissionRepository } from '../repository/task-permission.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonModule } from 'src/common/common.module';
import { OwnershipGuard } from 'src/common/guards/ownership.guard';

/**
 * タスク管理モジュール
 */
@Module({
  imports: [CommonModule],
  controllers: [TaskController],
  providers: [
    TaskService,
    TaskRepository,
    TaskPermissionService,
    TaskPermissionRepository,
    PrismaService,
    OwnershipGuard,
  ],
})
export class TaskModule {}
