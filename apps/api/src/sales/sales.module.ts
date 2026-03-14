import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesInvoice } from './entities/sales-invoice.entity';
import { SalesInvoiceLine } from './entities/sales-invoice-line.entity';
import { InvoicePayment } from './entities/invoice-payment.entity';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { DeliveryChallan } from './entities/delivery-challan.entity';
import { DeliveryChallanLine } from './entities/delivery-challan-line.entity';
import { InvoiceDeliveryChallan } from './entities/invoice-delivery-challan.entity';
import { CreditNote } from './entities/credit-note.entity';
import { RecurringInvoice } from './entities/recurring-invoice.entity';
import { Customer } from '../crm/entities/customer.entity';
import { Lead } from '../crm/entities/lead.entity';
import { Vendor } from '../purchase/entities/vendor.entity';
import { Company } from '../tenant/entities/company.entity';
import { Branch } from '../tenant/entities/branch.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [
    InventoryModule,
    TypeOrmModule.forFeature([
      SalesInvoice,
      SalesInvoiceLine,
      InvoicePayment,
      Quotation,
      QuotationItem,
      SalesOrder,
      SalesOrderLine,
      DeliveryChallan,
      DeliveryChallanLine,
      InvoiceDeliveryChallan,
      CreditNote,
      RecurringInvoice,
      Customer,
      Lead,
      Vendor,
      Company,
      Branch,
      Tenant,
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
