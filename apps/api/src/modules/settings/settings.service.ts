import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettingsEntity } from 'src/database/entities/user-settings.entity';
import { SettingsUpdateDto } from './dto/settings-update.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettingsEntity)
    private readonly repository: Repository<UserSettingsEntity>,
  ) {}

  async getByUser(userId: string) {
    let settings = await this.repository.findOne({ where: { userId } });
    if (!settings) {
      settings = await this.repository.save(
        this.repository.create({
          userId,
          defaultModule: 'my',
          reminderViewMode: 'dashboard',
          certificateGroupBy: 'owner',
          enablePushNotifications: true,
          theme: 'light',
        }),
      );
    }
    return this.toDto(settings);
  }

  async update(userId: string, dto: SettingsUpdateDto) {
    const settings = await this.getByUserEntity(userId);
    Object.assign(settings, {
      reminderViewMode: dto.reminderViewMode ?? settings.reminderViewMode,
      certificateGroupBy: dto.certificateGroupBy ?? settings.certificateGroupBy,
      enablePushNotifications: dto.enablePushNotifications ?? settings.enablePushNotifications,
    });

    return this.toDto(await this.repository.save(settings));
  }

  private async getByUserEntity(userId: string) {
    const settings = await this.repository.findOne({ where: { userId } });
    if (settings) return settings;

    return this.repository.save(
      this.repository.create({
        userId,
        defaultModule: 'my',
        reminderViewMode: 'dashboard',
        certificateGroupBy: 'owner',
        enablePushNotifications: true,
        theme: 'light',
      }),
    );
  }

  private toDto(entity: UserSettingsEntity) {
    return {
      id: entity.id,
      userId: entity.userId,
      defaultModule: entity.defaultModule,
      reminderViewMode: entity.reminderViewMode,
      certificateGroupBy: entity.certificateGroupBy,
      enablePushNotifications: entity.enablePushNotifications,
      theme: entity.theme,
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

