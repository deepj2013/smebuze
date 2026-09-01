import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { TenantSubscriptionPayment } from './entities/tenant-subscription-payment.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantSubscriptionPayment])],
  controllers: [BillingController],
  providers: [BillingService, SubscriptionGuard],
  exports: [BillingService, SubscriptionGuard, TypeOrmModule],
})
export class BillingModule {}
