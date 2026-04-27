import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum SyncEventType {
  BATCH_SYNC = 'BATCH_SYNC',
  REALTIME_SYNC = 'REALTIME_SYNC',
  ANNIVERSARY_BONUS = 'ANNIVERSARY_BONUS',
  YEARLY_REFRESH = 'YEARLY_REFRESH',
  MANUAL_RECONCILE = 'MANUAL_RECONCILE',
  RECONCILE_ALERT = 'RECONCILE_ALERT',
}

export enum SyncEventStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

@Entity('sync_events')
export class SyncEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  type: SyncEventType;

  @Column({ type: 'text', nullable: true })
  employeeId: string | null;

  @Column({ type: 'text', nullable: true })
  locationId: string | null;

  @Column({ type: 'real', nullable: true })
  previousBalance: number | null;

  @Column({ type: 'real', nullable: true })
  newBalance: number | null;

  @Column()
  triggeredBy: string;

  @Column({ type: 'text' })
  status: SyncEventStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'datetime', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
