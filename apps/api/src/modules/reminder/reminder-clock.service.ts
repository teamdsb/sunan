import { Injectable } from '@nestjs/common';

@Injectable()
export class ReminderClockService {
  now(): Date {
    return new Date();
  }

  today(): string {
    return this.now().toISOString().slice(0, 10);
  }
}
