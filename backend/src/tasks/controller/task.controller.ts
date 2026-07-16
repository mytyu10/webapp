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
import { TaskPermissionService } from '../service/task-permission.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  CreateNotificationDto,
} from '../dto/task.dto';
import { CreatePermissionDto } from 'src/permissions/permission.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { OwnershipGuard } from 'src/common/guards/ownership.guard';
import { CheckOwnership } from 'src/common/decorators/check-ownership.decorator';
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
    private readonly taskPermissionService: TaskPermissionService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * カテゴリ一覧取得エンドポイント（`/tasks/:id` より先に定義して衝突を防ぐ）
   * ログインユーザーが作成者または担当者であるタスクのカテゴリのみ返す
   */
  @Get('categories')
  async getCategories(
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, 'カテゴリ一覧取得リクエスト');
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const categories = await this.taskService.findAllCategories(
      requestUser.username,
    );
    return response.status(HttpStatus.OK).json(categories);
  }

  /**
   * タスク一覧取得エンドポイント
   * ログインユーザーが作成者または担当者または権限付与済みであるタスクのみ返す
   */
  @Get()
  async findAll(
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, 'タスク一覧取得リクエスト');
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const tasks = await this.taskService.findAll(requestUser.username);
    return response.status(HttpStatus.OK).json(tasks);
  }

  /**
   * タスク詳細取得エンドポイント
   * 作成者・担当者・権限保持者のみアクセス可能（OwnershipGuard）
   */
  @Get(':id')
  @CheckOwnership('task')
  @UseGuards(OwnershipGuard)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク詳細取得リクエスト: id=${id}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const task = await this.taskService.findById(id);
    return response.status(HttpStatus.OK).json(task);
  }

  /**
   * タスク作成エンドポイント。作成者はJWT認証済みユーザー名を使用する
   */
  @Post()
  async create(
    @Body() dto: CreateTaskDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク作成リクエスト: ${dto.title}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const task = await this.taskService.create(dto, requestUser.username);
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.TASK.CREATE_SUCCESS, task });
  }

  /**
   * タスク更新エンドポイント
   * 作成者・担当者・WRITE権限保持者のみ操作可能（OwnershipGuard）
   */
  @Patch(':id')
  @CheckOwnership('task')
  @UseGuards(OwnershipGuard)
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
   * 作成者・WRITE権限保持者のみ操作可能（OwnershipGuard）
   */
  @Delete(':id')
  @CheckOwnership('task')
  @UseGuards(OwnershipGuard)
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
   * 作成者・担当者・WRITE権限保持者のみ操作可能（OwnershipGuard）
   */
  @Post(':id/notifications')
  @CheckOwnership('task')
  @UseGuards(OwnershipGuard)
  async addNotification(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateNotificationDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `通知追加リクエスト: taskId=${id}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const notification = await this.taskNotificationService.addNotification(
      id,
      dto.notify_at,
    );
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.NOTIFICATION.CREATE_SUCCESS, notification });
  }

  /**
   * タスク通知一覧取得エンドポイント
   * 作成者・担当者・権限保持者のみアクセス可能（OwnershipGuard）
   */
  @Get(':id/notifications')
  @CheckOwnership('task')
  @UseGuards(OwnershipGuard)
  async getNotifications(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `通知一覧取得リクエスト: taskId=${id}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const notifications =
      await this.taskNotificationService.getNotifications(id);
    return response.status(HttpStatus.OK).json(notifications);
  }

  /**
   * タスク通知削除エンドポイント
   * 作成者・担当者・WRITE権限保持者のみ操作可能（OwnershipGuard）
   */
  @Delete(':id/notifications/:notificationId')
  @CheckOwnership('task')
  @UseGuards(OwnershipGuard)
  async removeNotification(
    @Param('id', ParseIntPipe) id: number,
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `通知削除リクエスト: taskId=${id}, notificationId=${notificationId}`,
    );
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    await this.taskNotificationService.removeNotification(notificationId);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.NOTIFICATION.DELETE_SUCCESS });
  }

  /**
   * タスク権限一覧取得エンドポイント（作成者のみ）
   */
  @Get(':id/permissions')
  async getPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク権限一覧取得リクエスト: taskId=${id}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const permissions = await this.taskPermissionService.findAll(
      id,
      requestUser.username,
    );
    return response.status(HttpStatus.OK).json(permissions);
  }

  /**
   * タスク権限付与エンドポイント（作成者のみ）
   */
  @Post(':id/permissions')
  async addPermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePermissionDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `タスク権限付与リクエスト: taskId=${id}, target=${dto.username}`,
    );
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const permission = await this.taskPermissionService.add(
      id,
      dto,
      requestUser.username,
    );
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.PERMISSION.ADD_SUCCESS, permission });
  }

  /**
   * タスク権限削除エンドポイント（作成者のみ）
   */
  @Delete(':id/permissions/:username')
  async removePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('username') targetUsername: string,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `タスク権限削除リクエスト: taskId=${id}, target=${targetUsername}`,
    );
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    await this.taskPermissionService.remove(
      id,
      targetUsername,
      requestUser.username,
    );
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.PERMISSION.REMOVE_SUCCESS });
  }
}
