import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  OWNERSHIP_RESOURCE_KEY,
  OwnershipResourceType,
} from '../decorators/check-ownership.decorator';
import { MESSAGE } from '../type/message';

/**
 * リソース所有者チェックガード
 * @CheckOwnership デコレータで指定されたリソースタイプに応じて、
 * リクエストユーザーが作成者・担当者（タスクのみ）・WRITE権限保持者のいずれかであることを確認する。
 * 該当しない場合は 403 ForbiddenException をスローする。
 * リソースが存在しない場合は 404 NotFoundException をスローする。
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<OwnershipResourceType>(
      OWNERSHIP_RESOURCE_KEY,
      context.getHandler(),
    );

    if (!resource) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException(MESSAGE.PERMISSION.FORBIDDEN);
    }

    const id = Number(request.params['id']);
    if (isNaN(id)) {
      return true;
    }

    if (resource === 'task') {
      return this.checkTaskOwnership(id, user.username);
    } else if (resource === 'link') {
      return this.checkLinkOwnership(id, user.username);
    } else if (resource === 'event') {
      return this.checkEventOwnership(id, user.username);
    }

    return true;
  }

  /**
   * タスクの認可チェック。
   * 作成者 / 担当者（TaskAssignee）/ WRITE権限保持者（TaskPermission）であれば許可する
   */
  private async checkTaskOwnership(
    taskId: number,
    username: string,
  ): Promise<boolean> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { where: { username } },
        permissions: { where: { username } },
      },
    });

    if (!task) {
      throw new NotFoundException(MESSAGE.TASK.NOT_FOUND);
    }

    if (task.created_by === username) {
      return true;
    }

    if (task.assignees.length > 0) {
      return true;
    }

    const permission = task.permissions[0];
    if (permission && permission.permission === 'WRITE') {
      return true;
    }

    throw new ForbiddenException(MESSAGE.TASK.FORBIDDEN);
  }

  /**
   * リンク/フォルダの認可チェック。
   * 作成者 / WRITE権限保持者（LinkPermission）であれば許可する
   */
  private async checkLinkOwnership(
    linkItemId: number,
    username: string,
  ): Promise<boolean> {
    const linkItem = await this.prisma.linkItem.findUnique({
      where: { id: linkItemId },
      include: {
        permissions: { where: { username } },
      },
    });

    if (!linkItem) {
      throw new NotFoundException(MESSAGE.LINK.NOT_FOUND);
    }

    if (linkItem.created_by === username) {
      return true;
    }

    const permission = linkItem.permissions[0];
    if (permission && permission.permission === 'WRITE') {
      return true;
    }

    throw new ForbiddenException(MESSAGE.LINK.FORBIDDEN);
  }

  /**
   * 予定の認可チェック。
   * 作成者であれば許可する
   */
  private async checkEventOwnership(
    eventId: number,
    username: string,
  ): Promise<boolean> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(MESSAGE.EVENT.NOT_FOUND);
    }

    if (event.created_by === username) {
      return true;
    }

    throw new ForbiddenException(MESSAGE.EVENT.FORBIDDEN);
  }
}
