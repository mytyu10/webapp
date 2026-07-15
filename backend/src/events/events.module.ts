import { Module } from '@nestjs/common';
import { EventController } from './controller/event.controller';
import { EventService } from './service/event.service';
import { EventRepository } from './repository/event.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonModule } from 'src/common/common.module';
import { OwnershipGuard } from 'src/common/guards/ownership.guard';

/**
 * 予定管理モジュール
 */
@Module({
  imports: [CommonModule],
  controllers: [EventController],
  providers: [EventService, EventRepository, PrismaService, OwnershipGuard],
})
export class EventsModule {}
