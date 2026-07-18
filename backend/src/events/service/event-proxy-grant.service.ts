import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EventProxyGrantRepository } from '../repository/event-proxy-grant.repository';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'EventProxyGrantService';

/** 代理登録権限レスポンスDTO */
export interface ProxyGrantResponseDto {
  username: string;
}

@Injectable()
export class EventProxyGrantService {
  constructor(
    private readonly eventProxyGrantRepository: EventProxyGrantRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 自分（granter）が代理登録を許可しているユーザー一覧を取得する
   */
  async findGrantees(granterUsername: string): Promise<ProxyGrantResponseDto[]> {
    this.logger.log(
      CONTEXT,
      `代理登録許可ユーザー一覧取得開始: granter=${granterUsername}`,
    );
    try {
      const records =
        await this.eventProxyGrantRepository.findAllGrantees(granterUsername);
      return records.map((r) => ({ username: r.grantee_username }));
    } catch (error) {
      this.logger.error(
        CONTEXT,
        `代理登録許可ユーザー一覧取得失敗: ${String(error)}`,
      );
      throw new InternalServerErrorException(
        MESSAGE.EVENT.PROXY_GRANT_FETCH_FAILED,
      );
    }
  }

  /**
   * 自分（grantee）が代理登録できるユーザー一覧を取得する
   */
  async findGranters(granteeUsername: string): Promise<ProxyGrantResponseDto[]> {
    this.logger.log(
      CONTEXT,
      `代理登録可能ユーザー一覧取得開始: grantee=${granteeUsername}`,
    );
    try {
      const records =
        await this.eventProxyGrantRepository.findAllGranters(granteeUsername);
      return records.map((r) => ({ username: r.granter_username }));
    } catch (error) {
      this.logger.error(
        CONTEXT,
        `代理登録可能ユーザー一覧取得失敗: ${String(error)}`,
      );
      throw new InternalServerErrorException(
        MESSAGE.EVENT.PROXY_GRANT_FETCH_FAILED,
      );
    }
  }

  /**
   * 代理登録権限を付与する（自分自身への付与は不可）
   */
  async add(
    granterUsername: string,
    granteeUsername: string,
  ): Promise<ProxyGrantResponseDto> {
    this.logger.log(
      CONTEXT,
      `代理登録権限付与開始: granter=${granterUsername}, grantee=${granteeUsername}`,
    );

    if (granterUsername === granteeUsername) {
      throw new BadRequestException(MESSAGE.EVENT.PROXY_GRANT_SELF_FORBIDDEN);
    }

    try {
      const record = await this.eventProxyGrantRepository.upsert(
        granterUsername,
        granteeUsername,
      );
      this.logger.log(
        CONTEXT,
        `代理登録権限付与完了: granter=${granterUsername}, grantee=${granteeUsername}`,
      );
      return { username: record.grantee_username };
    } catch (error) {
      this.logger.error(
        CONTEXT,
        `代理登録権限付与失敗: ${String(error)}`,
      );
      throw new InternalServerErrorException(
        MESSAGE.EVENT.PROXY_GRANT_ADD_FAILED,
      );
    }
  }

  /**
   * 代理登録権限を削除する
   */
  async remove(
    granterUsername: string,
    granteeUsername: string,
  ): Promise<void> {
    this.logger.log(
      CONTEXT,
      `代理登録権限削除開始: granter=${granterUsername}, grantee=${granteeUsername}`,
    );

    const existing = await this.eventProxyGrantRepository.findOne(
      granterUsername,
      granteeUsername,
    );
    if (!existing) {
      throw new NotFoundException(MESSAGE.EVENT.PROXY_GRANT_NOT_FOUND);
    }

    try {
      await this.eventProxyGrantRepository.delete(
        granterUsername,
        granteeUsername,
      );
      this.logger.log(
        CONTEXT,
        `代理登録権限削除完了: granter=${granterUsername}, grantee=${granteeUsername}`,
      );
    } catch (error) {
      this.logger.error(
        CONTEXT,
        `代理登録権限削除失敗: ${String(error)}`,
      );
      throw new InternalServerErrorException(
        MESSAGE.EVENT.PROXY_GRANT_REMOVE_FAILED,
      );
    }
  }
}
