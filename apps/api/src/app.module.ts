import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantModule } from './tenant/tenant.module';
import { OrganizationModule } from './organization/organization.module';
import { CrmModule } from './crm/crm.module';
import { SalesModule } from './sales/sales.module';
import { PurchaseModule } from './purchase/purchase.module';
import { InventoryModule } from './inventory/inventory.module';
import { AccountingModule } from './accounting/accounting.module';
import { ReportsModule } from './reports/reports.module';
import { BulkUploadModule } from './bulk-upload/bulk-upload.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { AuditModule } from './audit/audit.module';
import { AiModule } from './ai/ai.module';
import { SearchModule } from './search/search.module';
import { HrModule } from './hr/hr.module';
import { ServiceModule } from './service/service.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'smebuze',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.DB_LOGGING === 'true',
      }),
    }),
    AuthModule,
    TenantModule,
    OrganizationModule,
    CrmModule,
    SalesModule,
    PurchaseModule,
    InventoryModule,
    AccountingModule,
    ReportsModule,
    BulkUploadModule,
    IntegrationsModule,
    OnboardingModule,
    HealthModule,
    MailModule,
    AuditModule,
    AiModule,
    SearchModule,
    HrModule,
    ServiceModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
