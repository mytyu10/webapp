import { Module } from '@nestjs/common';
import { EventController } from './controller/event.controller';
import { EventService } from './service/event.service';
import { EventPermissionService } from './service/event-permission.service';
import { EventProxyGrantService } from './service/event-proxy-grant.service';
import { EventRepository } from './repository/event.repository';
import { EventPermissionRepository } from './repository/event-permission.repository';
import { EventProxyGrantRepository } from './repository/event-proxy-grant.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonModule } from 'src/common/common.module';
import { OwnershipGuard } from 'src/common/guards/ownership.guard';

/**
 * 予定管理モジュール
 */
@Module({
  imports: [CommonModule],
  controllers: [EventController],
  providers: [
    EventService,
    EventPermissionService,
    EventProxyGrantService,
    EventRepository,
    EventPermissionRepository,
    EventProxyGrantRepository,
    PrismaService,
    OwnershipGuard,
  ],
})
export class EventsModule {}
