import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TimeOffType {
  VACATION = 'VACATION',
  SICK = 'SICK',
  PERSONAL = 'PERSONAL',
}

export enum RequestStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  PENDING_RETRY = 'PENDING_RETRY',
}

@Entity('time_off_requests')
@Index(['employeeId', 'status'])
@Index(['locationId', 'status'])
export class TimeOffRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @Column()
  locationId: string;

  @Column({ type: 'text' })
  type: TimeOffType;

  @Column({ type: 'text' })
  startDate: string;

  @Column({ type: 'text' })
  endDate: string;

  @Column({ type: 'real' })
  daysRequested: number;

  @Column({ type: 'text', default: RequestStatus.PENDING })
  status: RequestStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  managerId: string | null;

  @Column({ type: 'text', nullable: true })
  managerNotes: string | null;

  @Column({ type: 'text', unique: true, nullable: true })
  idempotencyKey: string | null;

  @Column({ default: false })
  hcmDecrementConfirmed: boolean;

  @Column({ type: 'text', nullable: true })
  hcmErrorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date | null;
}
