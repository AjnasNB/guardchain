import { registerAs } from '@nestjs/config';
import { join } from 'path';

export const databaseConfig = registerAs('database', () => ({
  type: 'sqlite',
  path: process.env.DATABASE_PATH || join(process.cwd(), 'db', 'chainsure.db'),
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.DATABASE_LOGGING === 'true',
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.ts')],
  migrationsRun: true,
  entities: [join(__dirname, '..', '**', '*.entity.ts')],
})); 