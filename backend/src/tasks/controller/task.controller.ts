import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { TaskService } from '../service/task.service';
import { TaskNotificationService } from '../service/task-notification.service';
import { CreateTaskDto, UpdateTaskDto, CreateNotificationDto } from '../dto/task.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { HttpStatus } from 'src/common/type/status.enum';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'TaskController';

/**
 * タスク管理コントローラー
 * 全エンドポイントにJwtAuthGuardを適用する
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly taskNotificationService: TaskNotificationService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * カテゴリ一覧取得エンドポイント（`/tasks/:id` より先に定義して衝突を防ぐ）
   */
  @Get('categories')
  async getCategories(@Res() response: Response): Promise<Response> {
    this.logger.log(CONTEXT, 'カテゴリ一覧取得リクエスト');
    const categories = await this.taskService.findAllCategories();
    return response.status(HttpStatus.OK).json(categories);
  }

  /**
   * タスク一覧取得エンドポイント
   */
  @Get()
  async findAll(@Res() response: Response): Promise<Response> {
    this.logger.log(CONTEXT, 'タスク一覧取得リクエスト');
    const tasks = await this.taskService.findAll();
    return response.status(HttpStatus.OK).json(tasks);
  }

  /**
   * タスク詳細取得エンドポイント
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク詳細取得リクエスト: id=${id}`);
    const task = await this.taskService.findById(id);
    return response.status(HttpStatus.OK).json(task);
  }

  /**
   * タスク作成エンドポイント
   */
  @Post()
  async create(
    @Body() dto: CreateTaskDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク作成リクエスト: ${dto.title}`);
    const task = await this.taskService.create(dto);
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.TASK.CREATE_SUCCESS, task });
  }

  /**
   * タスク更新エンドポイント
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク更新リクエスト: id=${id}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const task = await this.taskService.update(id, dto, requestUser.username);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.TASK.QUEUE_UPDATE_SUCCESS, task });
  }

  /**
   * タスク削除エンドポイント
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク削除リクエスト: id=${id}`);
    await this.taskService.remove(id);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.TASK.DELETE_SUCCESS });
  }

  /**
   * タスク通知追加エンドポイント
   */
  @Post(':id/notifications')
  async addNotification(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateNotificationDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `通知追加リクエスト: taskId=${id}`);
    const notification = await this.taskNotificationService.addNotification(id, dto.notify_at);
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.NOTIFICATION.CREATE_SUCCESS, notification });
  }

  /**
   * タスク通知一覧取得エンドポイント
   */
  @Get(':id/notifications')
  async getNotifications(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `通知一覧取得リクエスト: taskId=${id}`);
    const notifications = await this.taskNotificationService.getNotifications(id);
    return response.status(HttpStatus.OK).json(notifications);
  }

  /**
   * タスク通知削除エンドポイント
   */
  @Delete(':id/notifications/:notificationId')
  async removeNotification(
    @Param('id', ParseIntPipe) id: number,
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `通知削除リクエスト: taskId=${id}, notificationId=${notificationId}`);
    await this.taskNotificationService.removeNotification(notificationId);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.NOTIFICATION.DELETE_SUCCESS });
  }
}
