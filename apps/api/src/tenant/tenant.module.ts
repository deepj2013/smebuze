import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformOrg } from './entities/platform-org.entity';
import { Tenant } from './entities/tenant.entity';
import { Company } from './entities/company.entity';
import { Branch } from './entities/branch.entity';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { FeatureGuard } from './feature.guard';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { UserRole } from '../auth/entities/user-role.entity';
import { Customer } from '../crm/entities/customer.entity';
import { Item } from '../inventory/entities/item.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { SalesOrder } from '../sales/entities/sales-order.entity';
import { LeadIngestEvent } from '../growth/entities/lead-ingest-event.entity';
import { StorefrontSite } from '../growth/entities/storefront-site.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformOrg,
      Tenant,
      Company,
      Branch,
      User,
      Role,
      UserRole,
      Customer,
      Item,
      SalesInvoice,
      SalesOrder,
      LeadIngestEvent,
      StorefrontSite,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [TenantController],
  providers: [TenantService, FeatureGuard],
  exports: [TypeOrmModule, TenantService, FeatureGuard],
})
export class TenantModule {}
