import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import {
  TaskNotificationRepository,
  PendingNotificationWithAssignees,
} from 'src/tasks/repository/task-notification.repository';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

const CONTEXT = 'LineNotificationService';

/** LINE Messaging API プッシュメッセージエンドポイント */
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

/** LINEプッシュメッセージのテキスト型 */
interface LineTextMessage {
  type: 'text';
  text: string;
}

/** LINEプッシュリクエスト型 */
interface LinePushRequest {
  to: string;
  messages: LineTextMessage[];
}

@Injectable()
export class LineNotificationService {
  constructor(
    private readonly notificationRepository: TaskNotificationRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 1分ごとに送信対象の通知を確認してLINEプッシュ通知を送信するCronジョブ
   * 送信成功後は is_sent を true に更新する
   * 送信失敗時はログを出力して is_sent は false のまま（次回実行で再試行可能）
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendPendingNotifications(): Promise<void> {
    this.logger.log(CONTEXT, 'LINE通知Cronジョブ開始');

    const accessToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? '';
    if (!accessToken) {
      this.logger.warn(
        CONTEXT,
        'LINE_MESSAGING_CHANNEL_ACCESS_TOKENが未設定です',
      );
      return;
    }

    let pendingNotifications: PendingNotificationWithAssignees[];
    try {
      pendingNotifications =
        await this.notificationRepository.findPendingNotifications();
    } catch (error) {
      this.logger.error(CONTEXT, `通知一覧取得失敗: ${String(error)}`);
      return;
    }

    if (pendingNotifications.length === 0) {
      this.logger.log(CONTEXT, '送信対象の通知なし');
      return;
    }

    this.logger.log(CONTEXT, `送信対象通知数: ${pendingNotifications.length}`);

    for (const notification of pendingNotifications) {
      const { task } = notification;
      const dueDateStr = new Date(task.due_date).toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      /** メッセージ本文を構築する */
      const messageText = `タスク期限のお知らせ\nタスク名: ${task.title}\n期限: ${dueDateStr}`;

      /** 担当者ごとにLINEプッシュ通知を送信する */
      for (const assignee of task.assignees) {
        const lineUserId = assignee.account.line_user_id;

        /** LINE未連携の担当者はスキップする */
        if (!lineUserId) {
          this.logger.log(
            CONTEXT,
            `LINE未連携のためスキップ: username=${assignee.username}`,
          );
          continue;
        }

        try {
          const payload: LinePushRequest = {
            to: lineUserId,
            messages: [{ type: 'text', text: messageText }],
          };
          await axios.post(LINE_PUSH_URL, payload, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          });
          this.logger.log(
            CONTEXT,
            `LINE通知送信成功: username=${assignee.username}, notificationId=${notification.id}`,
          );
        } catch (error) {
          this.logger.error(
            CONTEXT,
            `${MESSAGE.NOTIFICATION.LINE_SEND_FAILED}: username=${assignee.username}, notificationId=${notification.id} - ${String(error)}`,
          );
          /** 送信失敗時は is_sent を更新せず次回再試行できるようにする */
          continue;
        }
      }

      /** 全担当者への送信処理が完了したら is_sent を true に更新する */
      try {
        await this.notificationRepository.markAsSent(notification.id);
        this.logger.log(
          CONTEXT,
          `通知送信済みマーク完了: id=${notification.id}`,
        );
      } catch (error) {
        this.logger.error(
          CONTEXT,
          `通知送信済みマーク失敗: id=${notification.id} - ${String(error)}`,
        );
      }
    }

    this.logger.log(CONTEXT, 'LINE通知Cronジョブ完了');
  }
}
