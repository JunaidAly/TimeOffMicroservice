import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EmployeeRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
}

@Entity('employees')
export class Employee {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  managerId: string | null;

  @Column({ type: 'text', default: EmployeeRole.EMPLOYEE })
  role: EmployeeRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
