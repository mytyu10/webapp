import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { LogService } from '../service/log.service';
import { CreateLogDto } from '../dto/log.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { HttpStatus } from 'src/common/type/status.enum';
import type { JwtPayload } from 'src/jwt/jwt.payload';

/**
 * フロントエンドログ収集コントローラー
 * POST /log でフロントエンドの warn/error ログを受け取りファイルに記録する
 */
@Controller('log')
export class LogController {
  constructor(private readonly logService: LogService) {}

  /**
   * フロントエンドからのログを受け取るエンドポイント
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async createLog(
    @Body() dto: CreateLogDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.logService.handleLog(dto, currentUser.username);
  }
}
