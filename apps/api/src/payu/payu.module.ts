import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { TenantSubscriptionPayment } from '../billing/entities/tenant-subscription-payment.entity';
import { MarketplaceOrder } from '../marketplace/entities/marketplace-order.entity';
import { BillingModule } from '../billing/billing.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { PayuReturnController } from './payu-return.controller';
import { PayuReturnService } from './payu-return.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantSubscriptionPayment, MarketplaceOrder]),
    forwardRef(() => BillingModule),
    forwardRef(() => MarketplaceModule),
    forwardRef(() => IntegrationsModule),
  ],
  controllers: [PayuReturnController],
  providers: [PayuReturnService],
})
export class PayuModule {}
