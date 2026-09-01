import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesModule } from '../sales/sales.module';
import { PurchaseModule } from '../purchase/purchase.module';
import { AccountingModule } from '../accounting/accounting.module';
import { CrmModule } from '../crm/crm.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { GstReturnsService } from './gst-returns.service';
import { Gstr2aInvoice } from './entities/gstr2a-invoice.entity';
import { BusinessExpense } from '../ice-crest/entities/business-expense.entity';
import { Vendor } from '../purchase/entities/vendor.entity';

@Module({
  imports: [
    SalesModule,
    PurchaseModule,
    AccountingModule,
    CrmModule,
    InventoryModule,
    TypeOrmModule.forFeature([Gstr2aInvoice, BusinessExpense, Vendor]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, GstReturnsService],
  exports: [ReportsService, GstReturnsService],
})
export class ReportsModule {}
