import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { VendorPayment } from './entities/vendor-payment.entity';
import { Grn } from './entities/grn.entity';
import { GrnLine } from './entities/grn-line.entity';
import { DebitNote } from './entities/debit-note.entity';
import { Company } from '../tenant/entities/company.entity';
import { Branch } from '../tenant/entities/branch.entity';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor, PurchaseOrder, VendorPayment, Grn, GrnLine, DebitNote, Company, Branch]),
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
