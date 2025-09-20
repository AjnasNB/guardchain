import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Vote } from './vote.entity';

export enum ProposalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PASSED = 'passed',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
}

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'proposer_id' })
  proposerId: string;

  @Column({
    type: 'simple-enum',
    enum: ProposalStatus,
    default: ProposalStatus.DRAFT,
  })
  status: ProposalStatus;

  @Column({ name: 'start_time', type: 'datetime' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'datetime' })
  endTime: Date;

  @Column({ name: 'votes_for', type: 'decimal', precision: 20, scale: 8, default: '0' })
  votesFor: string;

  @Column({ name: 'votes_against', type: 'decimal', precision: 20, scale: 8, default: '0' })
  votesAgainst: string;

  @Column({ name: 'total_voting_power', type: 'decimal', precision: 20, scale: 8, default: '0' })
  totalVotingPower: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Vote, vote => vote.proposal)
  votes: Vote[];
} 