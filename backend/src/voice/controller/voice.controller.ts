import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { LoggerService } from 'src/common/service/logger.service';
import { VoiceService } from '../service/voice.service';
import { VoiceCommandRequestDto } from '../dto/voice.dto';
import type { VoiceCommandResult } from '../dto/voice.dto';

const CONTEXT = 'VoiceController';

@ApiTags('voice')
@ApiBearerAuth()
@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 音声認識テキストをClaude APIで解析し、実行すべきアクションを返す
   */
  @Post('command')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '音声コマンドを解析してアクションを返す' })
  async processCommand(
    @Body() dto: VoiceCommandRequestDto,
  ): Promise<VoiceCommandResult> {
    this.logger.log(CONTEXT, `音声コマンドリクエスト受信: "${dto.text}"`);
    return this.voiceService.processCommand(dto.text);
  }
}
