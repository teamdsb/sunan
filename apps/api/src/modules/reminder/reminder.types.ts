export type ReminderOwnerType = 'vessel' | 'vehicle' | 'personnel';
export type ReminderStatus = 'pending' | 'dispatching' | 'sent' | 'acknowledged' | 'failed';
export type ReminderType = 'upcoming' | 'overdue';

export interface ReminderJobEnvelope {
  jobId: string;
  source: 'manual' | 'cron';
}
