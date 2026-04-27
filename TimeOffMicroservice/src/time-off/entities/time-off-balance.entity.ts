import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { TimeOffType } from './time-off-request.entity';

@Entity('time_off_balances')
@Unique(['employeeId', 'locationId', 'type'])
export class TimeOffBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @Column()
  locationId: string;

  @Column({ type: 'text' })
  type: TimeOffType;

  @Column({ type: 'real', default: 0 })
  totalDays: number;

  @Column({ type: 'real', default: 0 })
  usedDays: number;

  @Column({ type: 'real', default: 0 })
  pendingDays: number;

  @Column({ type: 'real', default: 0 })
  availableDays: number;

  @Column({ type: 'datetime', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  hcmChecksum: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
