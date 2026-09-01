import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesModule } from '../sales/sales.module';
import { IntegrationsController } from './integrations.controller';
import { PayController, RazorpayWebhookController } from './pay.controller';
import { RazorpayService } from './razorpay.service';
import { WhatsappService } from './whatsapp.service';
import { WhatsappInboundMessage } from './entities/whatsapp-inbound-message.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Lead } from '../crm/entities/lead.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { InvoicePayment } from '../sales/entities/invoice-payment.entity';

@Module({
  imports: [SalesModule, TypeOrmModule.forFeature([WhatsappInboundMessage, Tenant, Lead, SalesInvoice, InvoicePayment])],
  controllers: [IntegrationsController, PayController, RazorpayWebhookController],
  providers: [WhatsappService, RazorpayService],
  exports: [WhatsappService, RazorpayService],
})
export class IntegrationsModule {}
