import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesModule } from '../sales/sales.module';
import { IntegrationsController } from './integrations.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappInboundMessage } from './entities/whatsapp-inbound-message.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Lead } from '../crm/entities/lead.entity';

@Module({
  imports: [SalesModule, TypeOrmModule.forFeature([WhatsappInboundMessage, Tenant, Lead])],
  controllers: [IntegrationsController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class IntegrationsModule {}
