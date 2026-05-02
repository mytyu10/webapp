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
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { TaskService } from '../service/task.service';
import { CreateTaskDto, UpdateTaskDto } from '../dto/task.dto';
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
    private readonly logger: LoggerService,
  ) {}

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
    @Body(ValidationPipe) dto: CreateTaskDto,
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
    @Body(ValidationPipe) dto: UpdateTaskDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `タスク更新リクエスト: id=${id}`);
    const task = await this.taskService.update(id, dto);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.TASK.UPDATE_SUCCESS, task });
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
}
