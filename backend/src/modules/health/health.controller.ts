import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  check() {
    const aiServiceUrl = this.configService.get<string>('aiService.url');
    
    return this.health.check([
      // Database health
      () => this.db.pingCheck('database'),
      
      // Memory usage (should be less than 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      
      // Storage (should have at least 250MB free) - Skip on Windows
      ...(process.platform !== 'win32' ? [() => this.disk.checkStorage('storage', { path: '/', threshold: 250 * 1024 * 1024 })] : []),
      
      // AI Service health (if configured)
      ...(aiServiceUrl ? [() => this.http.pingCheck('ai-service', `${aiServiceUrl}/health`)] : []),
    ]);
  }

  @Get('simple')
  @ApiOperation({ summary: 'Simple health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  simple() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get<string>('app.environment') || 'development',
      version: '1.0.0',
    };
  }
} 