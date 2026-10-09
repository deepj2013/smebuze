import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { TransportVehicle } from './transport-vehicle.entity';
import { Customer } from '../../crm/entities/customer.entity';
import { Employee } from '../../hr/entities/employee.entity';

@Entity('transport_trips')
export class TransportTrip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid', { nullable: true })
  company_id: string | null;

  @Column('uuid', { nullable: true })
  vehicle_id: string | null;

  @ManyToOne(() => TransportVehicle, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: TransportVehicle | null;

  @Column('uuid', { nullable: true })
  customer_id: string | null;

  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column('uuid', { nullable: true })
  driver_employee_id: string | null;

  @ManyToOne(() => Employee, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'driver_employee_id' })
  driver_employee: Employee | null;

  @Column('date')
  trip_date: Date;

  @Column({ type: 'varchar', length: 60, nullable: true })
  lr_number: string | null;

  @Column({ type: 'varchar', length: 150 })
  from_place: string;

  @Column({ type: 'varchar', length: 150 })
  to_place: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  party_name: string | null;

  @Column({ type: 'varchar', length: 20, default: 'company' })
  party_type: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  fare_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  diesel_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  other_expense: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  advance_amount: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  distance_km: string | null;

  @Column({ type: 'varchar', length: 20, default: 'completed' })
  status: string;

  @Column({ type: 'varchar', length: 20, default: 'unbilled' })
  bill_status: string;

  @Column('uuid', { nullable: true })
  invoice_id: string | null;

  @Column('text', { nullable: true })
  notes: string | null;

  @Column('uuid', { nullable: true })
  created_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
