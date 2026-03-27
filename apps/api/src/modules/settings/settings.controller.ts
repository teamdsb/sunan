import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { SettingsUpdateDto } from './dto/settings-update.dto';
import { SettingsService } from './settings.service';

@Controller('/api/v1/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  async getCurrentUserSettings(@CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getByUser(user.userId) };
  }

  @Patch()
  async updateCurrentUserSettings(
    @Body() dto: SettingsUpdateDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.update(user.userId, dto) };
  }
}

