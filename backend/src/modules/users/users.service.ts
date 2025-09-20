import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async findByWalletAddress(walletAddress: string) {
    const user = await this.userRepository.findOne({ 
      where: { walletAddress } 
    });
    return user;
  }

  async create(userData: any) {
    this.logger.log(`Creating user: ${userData.email}`);
    
    // Check if user already exists with this wallet address
    const existingUser = await this.findByWalletAddress(userData.walletAddress);
    if (existingUser) {
      return {
        success: true,
        user: existingUser,
        message: 'User already exists',
        isNewUser: false,
      };
    }

    // Check if email already exists
    const existingEmail = await this.userRepository.findOne({ 
      where: { email: userData.email } 
    });
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    const user = this.userRepository.create({
      ...userData,
      isActive: true,
      isVerified: false,
    });

    const savedUser = await this.userRepository.save(user);

    return {
      success: true,
      user: savedUser,
      message: 'User created successfully',
      isNewUser: true,
    };
  }

  async update(id: string, userData: any) {
    this.logger.log(`Updating user: ${id}`);
    
    const user = await this.findOne(id);
    const updatedUser = Object.assign(user, userData);
    const savedUser = await this.userRepository.save(updatedUser);
    
    return {
      success: true,
      user: savedUser,
      message: 'User updated successfully',
    };
  }

  async remove(id: string) {
    this.logger.log(`Deleting user: ${id}`);
    
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
    
    return {
      success: true,
      id,
      message: 'User deleted successfully',
    };
  }

  async getUserPolicies(userId: string) {
    // This will be implemented to fetch from blockchain
    return {
      userId,
      policies: [],
      total: 0,
    };
  }

  async getUserClaims(userId: string) {
    // This will be implemented to fetch from blockchain
    return {
      userId,
      claims: [],
      total: 0,
    };
  }
} 