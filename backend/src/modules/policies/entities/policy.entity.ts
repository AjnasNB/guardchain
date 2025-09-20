import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type: string; // 'health', 'vehicle', 'travel', etc.

  @Column()
  status: string; // 'active', 'expired', 'cancelled'

  @Column('decimal', { precision: 20, scale: 8 })
  coverageAmount: string;

  @Column('decimal', { precision: 20, scale: 8 })
  premiumAmount: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ nullable: true })
  nftTokenId: string;

  @Column({ type: 'simple-json', nullable: true })
  terms: any;

  @Column({ type: 'simple-json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 