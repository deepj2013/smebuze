import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Company } from '../tenant/entities/company.entity';
import { Item } from '../inventory/entities/item.entity';
import { Customer } from '../crm/entities/customer.entity';
import { Lead } from '../crm/entities/lead.entity';
import { SalesOrder } from '../sales/entities/sales-order.entity';
import { SalesOrderLine } from '../sales/entities/sales-order-line.entity';
import { DeliveryChallan } from '../sales/entities/delivery-challan.entity';
import { StorefrontSite } from './entities/storefront-site.entity';
import { LeadIngestEvent } from './entities/lead-ingest-event.entity';
import { PaymentGatewayAccount } from './entities/payment-gateway-account.entity';
import { GrowthService } from './growth.service';
import { GrowthController } from './growth.controller';
import { PublicStorefrontController } from './public-storefront.controller';
import { AdminStorefrontController } from './admin-storefront.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Company,
      Item,
      Customer,
      Lead,
      SalesOrder,
      SalesOrderLine,
      DeliveryChallan,
      StorefrontSite,
      LeadIngestEvent,
      PaymentGatewayAccount,
    ]),
  ],
  controllers: [GrowthController, PublicStorefrontController, AdminStorefrontController],
  providers: [GrowthService],
  exports: [GrowthService],
})
export class GrowthModule {}
