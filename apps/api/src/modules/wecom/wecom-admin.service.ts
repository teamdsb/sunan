import { Injectable } from '@nestjs/common';

import { appEnv } from 'src/config/env';

@Injectable()
export class WecomAdminService {
  private readonly adminUserIds = new Set(
    (appEnv.WECOM_SYSTEM_ADMIN_USER_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  isSystemAdmin(userId: string): boolean {
    return this.adminUserIds.has(userId);
  }
}
