import { Module } from '@nestjs/common';
import { AdminBackupController } from './admin-backup.controller';
import { AdminBackupService } from './admin-backup.service';

@Module({
  controllers: [AdminBackupController],
  providers: [AdminBackupService],
})
export class AdminBackupModule {}
