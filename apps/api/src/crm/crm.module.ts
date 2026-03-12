import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { Customer } from './entities/customer.entity';
import { FollowUp } from './entities/follow-up.entity';
import { ContactCategory } from './entities/contact-category.entity';
import { MessageTemplate } from './entities/message-template.entity';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, Customer, FollowUp, ContactCategory, MessageTemplate]),
    SalesModule,
  ],
  controllers: [CrmController, CampaignController],
  providers: [CrmService, CampaignService],
  exports: [CrmService, CampaignService],
})
export class CrmModule {}
