import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [ReportsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
