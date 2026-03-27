import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnterprisePolicyEntity } from 'src/database/entities/enterprise-policy.entity';
import { EnterprisePolicyFileEntity } from 'src/database/entities/enterprise-policy-file.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { EnterprisePolicyController } from './enterprise-policy.controller';
import { EnterprisePolicyService } from './enterprise-policy.service';

@Module({
  imports: [TypeOrmModule.forFeature([EnterprisePolicyEntity, EnterprisePolicyFileEntity, FileEntity, WecomUserEntity])],
  controllers: [EnterprisePolicyController],
  providers: [EnterprisePolicyService],
  exports: [EnterprisePolicyService],
})
export class EnterprisePolicyModule {}

