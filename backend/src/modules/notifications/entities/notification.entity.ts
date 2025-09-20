import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationType {
  CLAIM_APPROVED = 'claim_approved',
  CLAIM_REJECTED = 'claim_rejected',
  CLAIM_SUBMITTED = 'claim_submitted',
  POLICY_CREATED = 'policy_created',
  POLICY_EXPIRED = 'policy_expired',
  PREMIUM_DUE = 'premium_due',
  GOVERNANCE_PROPOSAL = 'governance_proposal',
  GOVERNANCE_VOTE_RESULT = 'governance_vote_result',
  SURPLUS_DISTRIBUTION = 'surplus_distribution',
  FRAUD_ALERT = 'fraud_alert',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  WELCOME = 'welcome',
  SECURITY_ALERT = 'security_alert',
}

@Entity('notifications')
@Index(['userId', 'status'])
@Index(['type', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'simple-enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'simple-enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @Column({
    type: 'simple-enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  // JSON data for dynamic content
  @Column({ type: 'simple-json', nullable: true })
  data?: {
    claimId?: string;
    policyId?: string;
    proposalId?: string;
    amount?: string;
    actionUrl?: string;
    metadata?: any;
  };

  // Optional action button configuration
  @Column({ type: 'simple-json', nullable: true })
  actions?: Array<{
    label: string;
    url: string;
    style?: 'primary' | 'secondary' | 'danger';
  }>;

  @Column({ name: 'read_at', type: 'datetime', nullable: true })
  readAt?: Date;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt?: Date;

  // Email notification tracking
  @Column({ name: 'email_sent', default: false })
  emailSent: boolean;

  @Column({ name: 'email_sent_at', type: 'datetime', nullable: true })
  emailSentAt?: Date;

  // Push notification tracking
  @Column({ name: 'push_sent', default: false })
  pushSent: boolean;

  @Column({ name: 'push_sent_at', type: 'datetime', nullable: true })
  pushSentAt?: Date;

  // Tracking and analytics
  @Column({ name: 'clicked', default: false })
  clicked: boolean;

  @Column({ name: 'clicked_at', type: 'datetime', nullable: true })
  clickedAt?: Date;

  @Column({ name: 'delivery_attempts', default: 0 })
  deliveryAttempts: number;

  @Column({ name: 'last_delivery_attempt', type: 'datetime', nullable: true })
  lastDeliveryAttempt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual fields
  get isRead(): boolean {
    return this.status === NotificationStatus.READ;
  }

  get isUnread(): boolean {
    return this.status === NotificationStatus.UNREAD;
  }

  get isArchived(): boolean {
    return this.status === NotificationStatus.ARCHIVED;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isUrgent(): boolean {
    return this.priority === NotificationPriority.URGENT;
  }

  get ageInMinutes(): number {
    const now = new Date();
    const created = new Date(this.createdAt);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
  }

  get ageInHours(): number {
    return Math.floor(this.ageInMinutes / 60);
  }

  get isRecentlyCreated(): boolean {
    return this.ageInMinutes < 30; // Less than 30 minutes old
  }

  // Mark as read
  markAsRead(): void {
    this.status = NotificationStatus.READ;
    this.readAt = new Date();
  }

  // Mark as clicked
  markAsClicked(): void {
    this.clicked = true;
    this.clickedAt = new Date();
  }

  // Check if notification should be displayed
  shouldDisplay(): boolean {
    return !this.isExpired && !this.isArchived;
  }
} 