import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from 'src/modules/auth/auth.module';
import { WecomDepartmentEntity } from 'src/database/entities/wecom-department.entity';
import { WecomSyncBatchEntity } from 'src/database/entities/wecom-sync-batch.entity';
import { WecomUserAuditEntity } from 'src/database/entities/wecom-user-audit.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { UserDirectoryController } from 'src/modules/user-directory/user-directory.controller';
import { UserDirectoryService } from 'src/modules/user-directory/user-directory.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      WecomUserEntity,
      WecomDepartmentEntity,
      WecomSyncBatchEntity,
      WecomUserAuditEntity,
    ]),
  ],
  controllers: [UserDirectoryController],
  providers: [UserDirectoryService],
})
export class UserDirectoryModule {}
