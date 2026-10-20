import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { Item } from './entities/item.entity';
import { ItemCategory } from './entities/item-category.entity';
import { Stock } from './entities/stock.entity';
import { StockTransfer } from './entities/stock-transfer.entity';
import { StockTransferLine } from './entities/stock-transfer-line.entity';
import { ItemRecipeLine } from './entities/item-recipe-line.entity';
import { ProductionRun } from './entities/production-run.entity';
import { ProductionRunLine } from './entities/production-run-line.entity';
import { ItemPromotion } from './entities/item-promotion.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      Item,
      ItemCategory,
      Stock,
      StockTransfer,
      StockTransferLine,
      ItemRecipeLine,
      ProductionRun,
      ProductionRunLine,
      ItemPromotion,
      Tenant,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
