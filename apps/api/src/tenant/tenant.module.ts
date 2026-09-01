import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformOrg, Tenant, Company, Branch, User]),
    AuthModule,
  ],
  controllers: [TenantController],
  providers: [TenantService, FeatureGuard],
  exports: [TypeOrmModule, TenantService, FeatureGuard],
})
export class TenantModule {}
