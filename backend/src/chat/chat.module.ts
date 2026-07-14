import { Module } from '@nestjs/common';
import { ChatController } from './controller/chat.controller';
import { ChatService } from './service/chat.service';
import { ChatRepository } from './repository/chat.repository';
import { ChatGateway } from './gateway/chat.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonModule } from 'src/common/common.module';
import { AccountsModule } from 'src/accounts/module/account.module';

/**
 * チャットモジュール
 * REST API（ChatController）と WebSocket Gateway（ChatGateway）の両方を提供する
 */
@Module({
  imports: [CommonModule, AccountsModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, ChatGateway, PrismaService],
})
export class ChatModule {}
