import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('claims')
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  policyId: string;

  @Column()
  type: string; // 'health', 'vehicle', 'travel', etc.

  @Column()
  status: string; // 'pending', 'approved', 'rejected', 'under_review'

  @Column('decimal', { precision: 20, scale: 8 })
  requestedAmount: string;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  approvedAmount: string;

  @Column('text')
  description: string;

  @Column({ type: 'simple-json', nullable: true })
  documents: string[]; // IPFS hashes

  @Column({ type: 'simple-json', nullable: true })
  images: string[]; // IPFS hashes

  @Column({ type: 'simple-json', nullable: true })
  aiAnalysis: any;

  @Column({ type: 'simple-json', nullable: true })
  reviewNotes: any;

  @Column({ nullable: true })
  transactionHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 