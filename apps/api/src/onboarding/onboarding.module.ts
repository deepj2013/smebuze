import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Company } from '../tenant/entities/company.entity';
import { Branch } from '../tenant/entities/branch.entity';
import { Customer } from '../crm/entities/customer.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { OnboardingEvent } from './entities/onboarding-event.entity';
import { OnboardingSurvey } from './entities/onboarding-survey.entity';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, Company, Branch, Customer, SalesInvoice, OnboardingEvent, OnboardingSurvey]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
