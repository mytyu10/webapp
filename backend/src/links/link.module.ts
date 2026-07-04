import { Module } from '@nestjs/common';
import { LinkController } from './controller/link.controller';
import { LinkService } from './service/link.service';
import { LinkRepository } from './repository/link.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonModule } from 'src/common/common.module';

/**
 * リンク集モジュール
 */
@Module({
  imports: [CommonModule],
  controllers: [LinkController],
  providers: [LinkService, LinkRepository, PrismaService],
})
export class LinkModule {}
