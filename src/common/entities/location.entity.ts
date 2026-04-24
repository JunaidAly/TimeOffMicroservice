import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('locations')
export class Location {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  country: string;

  @Column()
  timezone: string;

  @CreateDateColumn()
  createdAt: Date;
}
