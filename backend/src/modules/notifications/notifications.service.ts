import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async getUserNotifications(userId: string, pagination: { page: number; limit: number }) {
    // Mock data - in real implementation, fetch from database
    const mockNotifications = [
      {
        id: '1',
        userId,
        type: 'claim_approved',
        title: 'Claim Approved',
        message: 'Your health insurance claim #CL-2024-001 has been approved for $1,250.',
        data: { claimId: 'CL-2024-001', amount: 1250 },
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      },
      {
        id: '2',
        userId,
        type: 'policy_reminder',
        title: 'Premium Due',
        message: 'Your monthly premium of $150 is due in 3 days.',
        data: { amount: 150, dueDate: '2024-07-22' },
        read: false,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      },
      {
        id: '3',
        userId,
        type: 'governance_proposal',
        title: 'New Governance Proposal',
        message: 'A new proposal "Increase Coverage Limits" is now available for voting.',
        data: { proposalId: 'PROP-2024-003' },
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      },
    ];

    const { page, limit } = pagination;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      notifications: mockNotifications.slice(startIndex, endIndex),
      total: mockNotifications.length,
      page,
      limit,
      totalPages: Math.ceil(mockNotifications.length / limit),
    };
  }

  async getUnreadCount(userId: string) {
    // Mock data - count unread notifications
    return {
      userId,
      unreadCount: 2,
      lastChecked: new Date().toISOString(),
    };
  }

  async createNotification(notificationData: any) {
    this.logger.log(`Creating notification for user ${notificationData.userId}`);
    
    const notification = {
      id: `notif_${Date.now()}`,
      ...notificationData,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // In real implementation, save to database
    return {
      success: true,
      notification,
      message: 'Notification created successfully',
    };
  }

  async markAsRead(notificationId: string) {
    this.logger.log(`Marking notification ${notificationId} as read`);
    
    return {
      success: true,
      notificationId,
      message: 'Notification marked as read',
    };
  }

  async markAllAsRead(userId: string) {
    this.logger.log(`Marking all notifications as read for user ${userId}`);
    
    return {
      success: true,
      userId,
      updatedCount: 2,
      message: 'All notifications marked as read',
    };
  }

  async deleteNotification(notificationId: string) {
    this.logger.log(`Deleting notification ${notificationId}`);
    
    return {
      success: true,
      notificationId,
      message: 'Notification deleted successfully',
    };
  }

  async broadcastNotification(notificationData: any) {
    this.logger.log(`Broadcasting notification: ${notificationData.title}`);
    
    // In real implementation, send to all users or specific groups
    return {
      success: true,
      broadcastId: `broadcast_${Date.now()}`,
      recipients: 1247, // Total active users
      message: 'Notification broadcasted successfully',
      data: notificationData,
    };
  }

  async getTemplates() {
    return {
      templates: [
        {
          id: 'claim_approved',
          name: 'Claim Approved',
          subject: 'Your claim has been approved',
          template: 'Your {{claimType}} claim #{{claimId}} has been approved for ${{amount}}.',
          variables: ['claimType', 'claimId', 'amount'],
        },
        {
          id: 'claim_rejected',
          name: 'Claim Rejected',
          subject: 'Your claim requires attention',
          template: 'Your {{claimType}} claim #{{claimId}} has been rejected. Reason: {{reason}}',
          variables: ['claimType', 'claimId', 'reason'],
        },
        {
          id: 'premium_due',
          name: 'Premium Due',
          subject: 'Premium payment reminder',
          template: 'Your monthly premium of ${{amount}} is due on {{dueDate}}.',
          variables: ['amount', 'dueDate'],
        },
        {
          id: 'governance_vote',
          name: 'Governance Proposal',
          subject: 'New governance proposal available',
          template: 'A new proposal "{{proposalTitle}}" is available for voting until {{endDate}}.',
          variables: ['proposalTitle', 'endDate'],
        },
        {
          id: 'policy_created',
          name: 'Policy Created',
          subject: 'Welcome to ChainSure',
          template: 'Your {{policyType}} policy has been created successfully. Policy ID: {{policyId}}',
          variables: ['policyType', 'policyId'],
        },
      ],
    };
  }

  // Helper method to send different types of notifications
  async sendClaimNotification(userId: string, claimData: any, status: string) {
    const templates = {
      approved: {
        type: 'claim_approved',
        title: 'Claim Approved',
        message: `Your ${claimData.type} claim #${claimData.id} has been approved for $${claimData.amount}.`,
      },
      rejected: {
        type: 'claim_rejected',
        title: 'Claim Rejected',
        message: `Your ${claimData.type} claim #${claimData.id} has been rejected. Please review and resubmit if needed.`,
      },
      under_review: {
        type: 'claim_review',
        title: 'Claim Under Review',
        message: `Your ${claimData.type} claim #${claimData.id} is currently under review. We'll notify you once processed.`,
      },
    };

    const template = templates[status];
    if (template) {
      return this.createNotification({
        userId,
        ...template,
        data: claimData,
      });
    }
  }

  async sendGovernanceNotification(userId: string, proposalData: any) {
    return this.createNotification({
      userId,
      type: 'governance_proposal',
      title: 'New Governance Proposal',
      message: `A new proposal "${proposalData.title}" is now available for voting.`,
      data: proposalData,
    });
  }

  async sendPremiumReminder(userId: string, premiumData: any) {
    return this.createNotification({
      userId,
      type: 'premium_reminder',
      title: 'Premium Due',
      message: `Your monthly premium of $${premiumData.amount} is due in ${premiumData.daysUntilDue} days.`,
      data: premiumData,
    });
  }
} 