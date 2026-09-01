import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IceCrestController } from './ice-crest.controller';
import { IceCrestService } from './ice-crest.service';
import { BusinessExpense } from './entities/business-expense.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { Item } from '../inventory/entities/item.entity';
import { Stock } from '../inventory/entities/stock.entity';
import { Lead } from '../crm/entities/lead.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { Vendor } from '../purchase/entities/vendor.entity';
import { SalesOrder } from '../sales/entities/sales-order.entity';
import { AccountingModule } from '../accounting/accounting.module';

@Module({ imports: [InventoryModule, AccountingModule, TypeOrmModule.forFeature([BusinessExpense, StockMovement, Tenant, SalesInvoice, Item, Stock, Lead, Vendor, SalesOrder])], controllers: [IceCrestController], providers: [IceCrestService], exports: [IceCrestService] })
export class IceCrestModule {}
