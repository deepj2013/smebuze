import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { TenantSubscriptionPayment } from './entities/tenant-subscription-payment.entity';
import { TenantBillingMandate } from './entities/tenant-billing-mandate.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PartnersModule } from '../partners/partners.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantSubscriptionPayment, TenantBillingMandate, User]),
    forwardRef(() => PartnersModule),
    forwardRef(() => MarketplaceModule),
  ],
  controllers: [BillingController],
  providers: [BillingService, SubscriptionGuard],
  exports: [BillingService, SubscriptionGuard, TypeOrmModule],
})
export class BillingModule {}