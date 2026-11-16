import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import {
  AdminUserAuditQueryDto,
  AdminUserListQueryDto,
  RestoreUserAuthorizationDto,
  UpdateAdminUserDto,
} from 'src/modules/user-directory/dto/admin-user.dto';
import { UserDirectoryService } from 'src/modules/user-directory/user-directory.service';

@Controller('/api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('system_admin')
export class UserDirectoryController {
  constructor(private readonly directoryService: UserDirectoryService) {}

  // Keep the /users aliases for existing clients; the M9 contract uses the
  // explicit wecom-users and wecom-directory-sync paths.
  @Get(['wecom-users', 'users'])
  async list(@Query() query: AdminUserListQueryDto) {
    return { data: await this.directoryService.listUsers(query) };
  }

  @Get(['wecom-departments', 'departments'])
  async departments() {
    return { data: await this.directoryService.listDepartments() };
  }

  @Get(['wecom-users/:userId', 'users/:userId'])
  async get(@Param('userId') userId: string) {
    return { data: await this.directoryService.getUser(userId) };
  }

  @Get(['wecom-users/:userId/audits', 'users/:userId/audits'])
  async audits(@Param('userId') userId: string, @Query() query: AdminUserAuditQueryDto) {
    return { data: await this.directoryService.listAudits(userId, query) };
  }

  @Patch(['wecom-users/:userId/authorization', 'users/:userId'])
  async update(
    @Param('userId') userId: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return { data: await this.directoryService.updateUser(userId, dto, currentUser.userId) };
  }

  @Post(['wecom-users/:userId/restore-departments', 'users/:userId/restore-departments'])
  async restoreDepartments(
    @Param('userId') userId: string,
    @Body() dto: RestoreUserAuthorizationDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return {
      data: await this.directoryService.updateUser(
        userId,
        { expectedAuthorizationVersion: dto.expectedAuthorizationVersion, reason: dto.reason, departmentMode: 'follow_wecom' },
        currentUser.userId,
      ),
    };
  }

  @Post(['wecom-users/:userId/restore-roles', 'users/:userId/restore-roles'])
  async restoreRoles(
    @Param('userId') userId: string,
    @Body() dto: RestoreUserAuthorizationDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return {
      data: await this.directoryService.updateUser(
        userId,
        { expectedAuthorizationVersion: dto.expectedAuthorizationVersion, reason: dto.reason, roleMode: 'auto' },
        currentUser.userId,
      ),
    };
  }

  @Post(['wecom-directory-sync', 'users/sync'])
  async sync(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return { data: await this.directoryService.startSync(currentUser.userId) };
  }

  @Get(['wecom-directory-sync/:batchId', 'users/sync/:batchId'])
  async getSync(@Param('batchId') batchId: string) {
    return { data: await this.directoryService.getSyncBatch(batchId) };
  }
}
