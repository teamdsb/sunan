import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileEntity } from 'src/database/entities/file.entity';
import { FilesController } from 'src/modules/files/files.controller';
import { FilesService } from 'src/modules/files/files.service';
import { OssService } from 'src/modules/files/oss.service';
import { WecomModule } from 'src/modules/wecom/wecom.module';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity]), WecomModule],
  controllers: [FilesController],
  providers: [FilesService, OssService, JwtAuthGuard],
  exports: [FilesService],
})
export class FilesModule {}
