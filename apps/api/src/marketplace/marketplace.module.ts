import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Company } from '../tenant/entities/company.entity';
import { Item } from '../inventory/entities/item.entity';
import { Customer } from '../crm/entities/customer.entity';
import { SalesOrder } from '../sales/entities/sales-order.entity';
import { SalesOrderLine } from '../sales/entities/sales-order-line.entity';
import { StorefrontSite } from '../growth/entities/storefront-site.entity';
import { TenantSubscriptionPayment } from '../billing/entities/tenant-subscription-payment.entity';
import { HubCatalogItem } from './entities/hub-catalog-item.entity';
import { HubItemLink } from './entities/hub-item-link.entity';
import { HubOrder } from './entities/hub-order.entity';
import { HubOrderLine } from './entities/hub-order-line.entity';
import { TenantCommerceSettings } from './entities/tenant-commerce-settings.entity';
import { MallListing } from './entities/mall-listing.entity';
import { MarketplaceOrder } from './entities/marketplace-order.entity';
import { MarketplaceSettlement } from './entities/marketplace-settlement.entity';
import { DeliveryJob } from './entities/delivery-job.entity';
import { HubService } from './hub.service';
import { MallService } from './mall.service';
import { CommerceService } from './commerce.service';
import { MarketplacePaymentsService } from './marketplace-payments.service';
import { SettlementSchedulerService } from './settlement-scheduler.service';
import { HubController } from './hub.controller';
import { AdminHubController } from './admin-hub.controller';
import { PublicMallController } from './public-mall.controller';
import { TenantCommerceController } from './tenant-commerce.controller';
import { AdminMarketplaceController } from './admin-marketplace.controller';

@Module({
  imports: [
    InventoryModule,
    TypeOrmModule.forFeature([
      HubCatalogItem,
      HubItemLink,
      HubOrder,
      HubOrderLine,
      TenantCommerceSettings,
      MallListing,
      MarketplaceOrder,
      MarketplaceSettlement,
      DeliveryJob,
      Tenant,
      Company,
      Item,
      Customer,
      SalesOrder,
      SalesOrderLine,
      StorefrontSite,
      TenantSubscriptionPayment,
    ]),
  ],
  controllers: [
    HubController,
    AdminHubController,
    PublicMallController,
    TenantCommerceController,
    AdminMarketplaceController,
  ],
  providers: [
    HubService,
    MallService,
    CommerceService,
    MarketplacePaymentsService,
    SettlementSchedulerService,
  ],
  exports: [HubService, MallService, CommerceService, MarketplacePaymentsService, SettlementSchedulerService],
})
export class MarketplaceModule {}
