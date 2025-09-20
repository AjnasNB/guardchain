import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  async getDashboardAnalytics() {
    return {
      totalPolicies: 145,
      activeClaims: 23,
      totalStaked: '2,450,000',
      monthlyPremiums: '184,500',
      claimsProcessed: 87,
      fraudDetected: 5,
      avgProcessingTime: '2.3 days',
      customerSatisfaction: 4.7,
      trends: {
        policies: '+12%',
        claims: '+5%',
        fraud: '-15%',
        satisfaction: '+8%'
      },
      recentActivity: [
        { type: 'policy_created', amount: '5,000', user: 'John D.', time: '2 hours ago' },
        { type: 'claim_approved', amount: '1,200', user: 'Sarah M.', time: '4 hours ago' },
        { type: 'governance_vote', amount: '25,000', user: 'Mike R.', time: '6 hours ago' },
      ]
    };
  }

  async getClaimsStats(period: string = '30d') {
    const mockData = {
      '7d': {
        total: 45,
        approved: 32,
        rejected: 8,
        pending: 5,
        avgAmount: '1,250',
        avgProcessingTime: '1.8 days'
      },
      '30d': {
        total: 187,
        approved: 142,
        rejected: 28,
        pending: 17,
        avgAmount: '1,450',
        avgProcessingTime: '2.1 days'
      },
      '90d': {
        total: 542,
        approved: 428,
        rejected: 76,
        pending: 38,
        avgAmount: '1,380',
        avgProcessingTime: '2.3 days'
      }
    };

    return {
      period,
      stats: mockData[period] || mockData['30d'],
      byType: {
        health: { count: 89, percentage: 47.6 },
        vehicle: { count: 56, percentage: 29.9 },
        travel: { count: 32, percentage: 17.1 },
        other: { count: 10, percentage: 5.3 }
      },
      fraudDetection: {
        flaggedClaims: 12,
        fraudRate: 6.4,
        savedAmount: '45,600'
      },
      aiPerformance: {
        accuracy: 94.2,
        processingSpeed: '98% under 30s',
        confidenceScore: 87.5
      }
    };
  }

  async getPoliciesStats(period: string = '30d') {
    return {
      period,
      totalPolicies: 1247,
      activePolicies: 1189,
      newPolicies: 34,
      renewals: 89,
      cancellations: 12,
      byType: {
        health: { count: 567, premium: '245,600', coverage: '12,450,000' },
        vehicle: { count: 334, premium: '178,900', coverage: '8,900,000' },
        travel: { count: 201, premium: '89,400', coverage: '3,200,000' },
        pet: { count: 145, premium: '67,800', coverage: '1,800,000' }
      },
      premiumCollection: {
        total: '581,700',
        onTime: '94.2%',
        overdue: '5.8%'
      },
      customerRetention: {
        rate: '91.5%',
        avgTenure: '2.3 years',
        churnRate: '8.5%'
      }
    };
  }

  async getFinancialOverview() {
    return {
      treasury: {
        totalFunds: '5,670,000',
        stablecoin: '4,230,000',
        bnb: '890,000',
        invested: '550,000'
      },
      revenue: {
        monthly: '184,500',
        yearly: '2,134,000',
        growth: '+15.3%'
      },
      expenses: {
        claims: '1,456,000',
        operations: '234,000',
        development: '145,000'
      },
      reserves: {
        total: '3,890,000',
        ratio: '68.6%',
        recommended: '60%',
        status: 'healthy'
      },
      surplus: {
        available: '1,234,000',
        distributed: '456,000',
        pendingDistribution: '178,000'
      }
    };
  }

  async getAIInsights() {
    return {
      processing: {
        totalDocuments: 2847,
        dailyAverage: 89,
        successRate: '97.2%',
        avgProcessingTime: '12.3s'
      },
      fraudDetection: {
        totalAnalyzed: 1567,
        flaggedSuspicious: 94,
        confirmedFraud: 23,
        savedAmount: '234,500',
        accuracy: '94.8%'
      },
      geminiIntegration: {
        apiCalls: 1234,
        successRate: '99.1%',
        avgResponseTime: '2.1s',
        insights: [
          'Medical claims show 15% higher accuracy with Gemini analysis',
          'Vehicle damage assessment improved by 23%',
          'Document authenticity detection up 31%'
        ]
      },
      modelPerformance: {
        ocrAccuracy: '96.4%',
        imageAnalysis: '93.7%',
        textClassification: '91.2%'
      }
    };
  }

  async getBlockchainMetrics() {
    return {
      network: {
        name: 'BSC Testnet',
        status: 'Connected',
        blockHeight: 42789456,
        gasPrice: '5 gwei'
      },
      contracts: {
        stablecoin: {
          address: '0x644Ed1D005Eadbaa4D4e05484AEa8e52A4DB76c8',
          totalSupply: '10,000,000',
          holders: 1247
        },
        governance: {
          address: '0xD0aa884859B93aFF4324B909fAeC619096f0Cc05',
          totalStaked: '2,450,000',
          voters: 456
        },
        policies: {
          address: '0x2e2acdf394319b365Cc46cF587ab8a2d25Cb3312',
          totalPolicies: 1189,
          activeNFTs: 1189
        }
      },
      transactions: {
        total: 5643,
        today: 23,
        avgGasUsed: '85,000',
        totalFees: '12.45 BNB'
      },
      governance: {
        activeProposals: 3,
        totalVotes: 1567,
        participationRate: '67.8%',
        avgVotingPower: '5,376'
      }
    };
  }
} 