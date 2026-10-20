import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { VendorPayment } from './entities/vendor-payment.entity';
import { Grn } from './entities/grn.entity';
import { GrnLine } from './entities/grn-line.entity';
import { DebitNote } from './entities/debit-note.entity';
import { PurchaseInvoice } from './entities/purchase-invoice.entity';
import { PurchaseInvoiceLine } from './entities/purchase-invoice-line.entity';
import { Company } from '../tenant/entities/company.entity';
import { Branch } from '../tenant/entities/branch.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';

@Module({
  imports: [
    InventoryModule,
    TypeOrmModule.forFeature([
      Vendor,
      PurchaseOrder,
      VendorPayment,
      Grn,
      GrnLine,
      DebitNote,
      PurchaseInvoice,
      PurchaseInvoiceLine,
      Company,
      Branch,
    ]),
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
