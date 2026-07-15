import { Module } from '@nestjs/common';
import { LinkController } from './controller/link.controller';
import { LinkService } from './service/link.service';
import { LinkRepository } from './repository/link.repository';
import { LinkPermissionService } from './service/link-permission.service';
import { LinkPermissionRepository } from './repository/link-permission.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonModule } from 'src/common/common.module';
import { OwnershipGuard } from 'src/common/guards/ownership.guard';

/**
 * リンク集モジュール
 */
@Module({
  imports: [CommonModule],
  controllers: [LinkController],
  providers: [
    LinkService,
    LinkRepository,
    LinkPermissionService,
    LinkPermissionRepository,
    PrismaService,
    OwnershipGuard,
  ],
})
export class LinkModule {}
