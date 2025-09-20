import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { MulterModule } from '@nestjs/platform-express';

// Import our config
import { AppConfig } from './config/app.config';

// Import modules
import { HealthModule } from './modules/health/health.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { UsersModule } from './modules/users/users.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { AIModule } from './modules/ai/ai.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { GovernanceModule } from './modules/governance/governance.module';

// Import entities
import { User } from './modules/users/entities/user.entity';
import { Policy } from './modules/policies/entities/policy.entity';
import { Claim } from './modules/claims/entities/claim.entity';
import { BlockchainTransaction } from './modules/blockchain/entities/blockchain-transaction.entity';
import { Notification } from './modules/notifications/entities/notification.entity';
import { Proposal } from './modules/governance/entities/proposal.entity';
import { Vote } from './modules/governance/entities/vote.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => AppConfig],
    }),

    // Database configuration
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: AppConfig.database.path,
      entities: [User, Policy, Claim, BlockchainTransaction, Notification, Proposal, Vote],
      synchronize: AppConfig.database.synchronize,
      autoLoadEntities: AppConfig.database.autoLoadEntities,
      logging: AppConfig.database.logging,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: AppConfig.rateLimit.ttl,
      limit: AppConfig.rateLimit.max,
    }]),

    // File upload configuration
    MulterModule.register({
      dest: AppConfig.upload.uploadPath,
      limits: {
        fileSize: AppConfig.upload.maxFileSize,
      },
    }),

    // Feature modules
    HealthModule,
    UsersModule,
    PoliciesModule,
    ClaimsModule,
    BlockchainModule,
    AIModule,
    NotificationsModule,
    AnalyticsModule,
    GovernanceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {} 