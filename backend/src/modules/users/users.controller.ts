import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    return this.usersService.findAll({ page: pageNum, limit: limitNum });
  }

  @Get('wallet/:walletAddress')
  @ApiOperation({ summary: 'Get user by wallet address' })
  async findByWalletAddress(@Param('walletAddress') walletAddress: string) {
    const user = await this.usersService.findByWalletAddress(walletAddress);
    if (!user) {
      return {
        users: [],
        total: 0,
        isNewUser: true,
      };
    }
    return {
      users: [user],
      total: 1,
      isNewUser: false,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  async create(@Body() userData: any) {
    return this.usersService.create(userData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() userData: any) {
    return this.usersService.update(id, userData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get(':id/policies')
  @ApiOperation({ summary: 'Get user policies' })
  async getUserPolicies(@Param('id') id: string) {
    return this.usersService.getUserPolicies(id);
  }

  @Get(':id/claims')
  @ApiOperation({ summary: 'Get user claims' })
  async getUserClaims(@Param('id') id: string) {
    return this.usersService.getUserClaims(id);
  }
} 