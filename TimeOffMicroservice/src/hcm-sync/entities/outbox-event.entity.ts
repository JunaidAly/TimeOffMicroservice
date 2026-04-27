import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum OutboxStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

@Entity('outbox_events')
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  aggregateId: string;

  @Column()
  aggregateType: string;

  @Column()
  eventType: string;

  @Column({ type: 'simple-json' })
  payload: Record<string, unknown>;

  @Column({ type: 'text', default: OutboxStatus.PENDING })
  status: OutboxStatus;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastAttemptAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
