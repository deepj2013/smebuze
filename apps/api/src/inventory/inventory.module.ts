import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { Item } from './entities/item.entity';
import { ItemCategory } from './entities/item-category.entity';
import { Stock } from './entities/stock.entity';
import { StockTransfer } from './entities/stock-transfer.entity';
import { StockTransferLine } from './entities/stock-transfer-line.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse, Item, ItemCategory, Stock, StockTransfer, StockTransferLine])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
