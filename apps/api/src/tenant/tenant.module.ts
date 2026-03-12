import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformOrg } from './entities/platform-org.entity';
import { Tenant } from './entities/tenant.entity';
import { Company } from './entities/company.entity';
import { Branch } from './entities/branch.entity';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { FeatureGuard } from './feature.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformOrg, Tenant, Company, Branch]),
  ],
  controllers: [TenantController],
  providers: [TenantService, FeatureGuard],
  exports: [TypeOrmModule, TenantService, FeatureGuard],
})
export class TenantModule {}
