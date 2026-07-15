import { SetMetadata } from '@nestjs/common';

/** 認可チェック対象リソースタイプ */
export type OwnershipResourceType = 'task' | 'link' | 'event';

/** OwnershipGuard に渡すメタデータキー */
export const OWNERSHIP_RESOURCE_KEY = 'ownershipResource';

/**
 * リソース所有者チェックデコレータ
 * OwnershipGuard と組み合わせて使用する。
 * @param resource チェック対象のリソースタイプ（'task' | 'link' | 'event'）
 * @example @CheckOwnership('task')
 */
export const CheckOwnership = (resource: OwnershipResourceType) =>
  SetMetadata(OWNERSHIP_RESOURCE_KEY, resource);
