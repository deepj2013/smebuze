import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportVehicle } from './entities/transport-vehicle.entity';
import { VehicleDocument } from './entities/vehicle-document.entity';
import { TransportTrip } from './entities/transport-trip.entity';
import { Customer } from '../crm/entities/customer.entity';
import { Company } from '../tenant/entities/company.entity';
import { SalesModule } from '../sales/sales.module';
import { TransportService } from './transport.service';
import { TransportController } from './transport.controller';

@Module({
  imports: [
    SalesModule,
    TypeOrmModule.forFeature([TransportVehicle, VehicleDocument, TransportTrip, Customer, Company]),
  ],
  controllers: [TransportController],
  providers: [TransportService],
  exports: [TransportService],
})
export class TransportModule {}
