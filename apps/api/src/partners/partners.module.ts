import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { PlatformPartner } from './entities/platform-partner.entity';
import { PlatformCommission } from './entities/platform-commission.entity';
import { BdeLead } from './entities/bde-lead.entity';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformPartner, PlatformCommission, BdeLead, Tenant, User]),
    forwardRef(() => AuthModule),
  ],
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
