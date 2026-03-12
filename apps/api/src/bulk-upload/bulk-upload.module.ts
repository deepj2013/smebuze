import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BulkUploadController } from './bulk-upload.controller';
import { BulkUploadService } from './bulk-upload.service';
import { Customer } from '../crm/entities/customer.entity';
import { Item } from '../inventory/entities/item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Item])],
  controllers: [BulkUploadController],
  providers: [BulkUploadService],
})
export class BulkUploadModule {}
