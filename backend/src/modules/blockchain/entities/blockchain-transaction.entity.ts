import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('blockchain_transactions')
export class BlockchainTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hash: string;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column()
  value: string;

  @Column()
  gasUsed: string;

  @Column()
  gasPrice: string;

  @Column()
  blockNumber: number;

  @Column()
  status: string; // 'pending', 'confirmed', 'failed'

  @Column()
  type: string; // 'policy_creation', 'claim_submission', 'governance_vote', etc.

  @Column({ nullable: true })
  relatedEntityId: string;

  @Column({ nullable: true })
  relatedEntityType: string;

  @Column('text', { nullable: true })
  data: string; // JSON data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 