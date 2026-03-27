import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { FileCallbackDto } from 'src/modules/files/dto/file-callback.dto';
import { FileFromWecomDto } from 'src/modules/files/dto/file-from-wecom.dto';
import { FilePresignDto } from 'src/modules/files/dto/file-presign.dto';
import { FilesService } from 'src/modules/files/files.service';

@Controller('/api/v1/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('presign')
  createPresign(@Body() dto: FilePresignDto) {
    return {
      data: this.filesService.createPresign(dto),
    };
  }

  @Post('callback')
  async registerCallback(
    @Body() dto: FileCallbackDto,
    @CurrentUserDecorator() currentUser?: CurrentUser,
  ) {
    return {
      data: await this.filesService.registerCallback(dto, currentUser),
    };
  }

  @Get(':ossKey/download-url')
  async getDownloadUrl(@Param('ossKey') ossKey: string) {
    return {
      data: await this.filesService.getDownloadUrl(ossKey),
    };
  }

  @Post('from-wecom')
  async fromWecom(
    @Body() dto: FileFromWecomDto,
    @CurrentUserDecorator() currentUser?: CurrentUser,
  ) {
    return {
      data: await this.filesService.saveFromWecom(dto, currentUser),
    };
  }
}
