import { Module } from '@nestjs/common';
import { EventController } from './controller/event.controller';
import { EventService } from './service/event.service';
import { EventRepository } from './repository/event.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonModule } from 'src/common/common.module';

/**
 * 予定管理モジュール
 */
@Module({
  imports: [CommonModule],
  controllers: [EventController],
  providers: [EventService, EventRepository, PrismaService],
})
export class EventsModule {}
