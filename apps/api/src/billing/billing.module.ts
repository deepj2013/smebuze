import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { TenantSubscriptionPayment } from './entities/tenant-subscription-payment.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PartnersModule } from '../partners/partners.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantSubscriptionPayment, User]),
    forwardRef(() => PartnersModule),
  ],
  controllers: [BillingController],
  providers: [BillingService, SubscriptionGuard],
  exports: [BillingService, SubscriptionGuard, TypeOrmModule],
})
export class BillingModule {}