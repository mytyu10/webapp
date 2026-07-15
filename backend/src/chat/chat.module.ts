import { Module } from '@nestjs/common';
import { ChatController } from './controller/chat.controller';
import { ChatService } from './service/chat.service';
import { ChatRepository } from './repository/chat.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonModule } from 'src/common/common.module';
import { AccountsModule } from 'src/accounts/module/account.module';

/**
 * チャットモジュール
 * REST API（ChatController）のみを提供する。メッセージ更新はポーリング方式で行う
 */
@Module({
  imports: [CommonModule, AccountsModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, PrismaService],
})
export class ChatModule {}
