import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Proposal } from './proposal.entity';

export enum VoteChoice {
  FOR = 'for',
  AGAINST = 'against',
  ABSTAIN = 'abstain',
}

@Entity('votes')
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'proposal_id' })
  proposalId: string;

  @Column({ name: 'claim_id', nullable: true })
  claimId: string;

  @Column({
    type: 'simple-enum',
    enum: VoteChoice,
  })
  choice: VoteChoice;

  @Column({ name: 'suggested_amount', type: 'decimal', precision: 20, scale: 8, nullable: true })
  suggestedAmount: string;

  @Column({ type: 'text', nullable: true })
  reasoning: string;

  @Column({ name: 'voting_power', type: 'decimal', precision: 20, scale: 8 })
  votingPower: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Proposal, proposal => proposal.votes)
  @JoinColumn({ name: 'proposal_id' })
  proposal: Proposal;
} 