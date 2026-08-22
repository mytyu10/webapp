import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { VoiceController } from './controller/voice.controller';
import { VoiceService } from './service/voice.service';

/**
 * 音声コマンドモジュール
 * POST /voice/command で音声認識テキストを受け取り、Claude API で意図解析して返す
 */
@Module({
  imports: [CommonModule],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
