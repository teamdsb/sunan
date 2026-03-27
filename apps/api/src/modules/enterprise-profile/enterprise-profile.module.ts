import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnterpriseProfileEntity } from 'src/database/entities/enterprise-profile.entity';
import { EnterpriseProfileFileEntity } from 'src/database/entities/enterprise-profile-file.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { EnterpriseProfileController } from './enterprise-profile.controller';
import { EnterpriseProfileService } from './enterprise-profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([EnterpriseProfileEntity, EnterpriseProfileFileEntity, FileEntity, WecomUserEntity])],
  controllers: [EnterpriseProfileController],
  providers: [EnterpriseProfileService],
  exports: [EnterpriseProfileService],
})
export class EnterpriseProfileModule {}

