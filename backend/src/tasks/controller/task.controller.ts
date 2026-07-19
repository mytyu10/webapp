import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { TaskService } from '../service/task.service';
import { TaskPermissionService } from '../service/task-permission.service';
import { CreateTaskDto, UpdateTaskDto } from '../dto/task.dto';
import { CreatePermissionDto } from 'src/permissions/permission.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { OwnershipGuard } from 'src/common/guards/ownership.guard';
import { CheckOwnership } from 'src/common/decorators/check-ownership.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { HttpStatus } from 'src/common/type/status.enum';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';
import type { JwtPayload } from 'src/jwt/jwt.payload';

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
    private readonly taskPermissionService: TaskPermissionService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * カテゴリ一覧取得エンドポイント（`/tasks/:id` より先に定義して衝突を防ぐ）
   * ログインユーザーが作成者または担当者であるタスクのカテゴリのみ返す
   */
  @Get('categories')
  async getCategories(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, 'カテゴリ一覧取得リクエスト');
    const categories = await this.taskService.findAllCategories(
      currentUser.username,
    );
    return response.status(HttpStatus.OK).json(categories);
  }

  /**
   * タスク一覧取得エンドポイント
   * ログインユーザーが作成者または担当者または権限付与済みであるタスクのみ返す
   */
  @Get()
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, 'タスク一覧取得リクエスト');
    const tasks = await this.taskService.findAll(currentUser.username);
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
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク詳細取得リクエスト: id=${id}`);
    const task = await this.taskService.findById(id);
    return response.status(HttpStatus.OK).json(task);
  }

  /**
   * タスク作成エンドポイント。作成者はJWT認証済みユーザー名を使用する
   */
  @Post()
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク作成リクエスト: ${dto.title}`);
    const task = await this.taskService.create(dto, currentUser.username);
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
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク更新リクエスト: id=${id}`);
    const task = await this.taskService.update(id, dto, currentUser.username);
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
   * タスク権限一覧取得エンドポイント（作成者のみ）
   */
  @Get(':id/permissions')
  async getPermissions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク権限一覧取得リクエスト: taskId=${id}`);
    const permissions = await this.taskPermissionService.findAll(
      id,
      currentUser.username,
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
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `タスク権限付与リクエスト: taskId=${id}, target=${dto.username}`,
    );
    const permission = await this.taskPermissionService.add(
      id,
      dto,
      currentUser.username,
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
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `タスク権限削除リクエスト: taskId=${id}, target=${targetUsername}`,
    );
    await this.taskPermissionService.remove(
      id,
      targetUsername,
      currentUser.username,
    );
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.PERMISSION.REMOVE_SUCCESS });
  }
}
