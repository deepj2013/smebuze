import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { PurchaseModule } from '../purchase/purchase.module';
import { SalesModule } from '../sales/sales.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [CrmModule, PurchaseModule, SalesModule, InventoryModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
