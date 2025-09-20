import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { ContractService } from './contract.service';
import { BlockchainTransaction } from './entities/blockchain-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockchainTransaction]),
  ],
  controllers: [BlockchainController],
  providers: [BlockchainService, ContractService],
  exports: [BlockchainService, ContractService],
})
export class BlockchainModule {} 