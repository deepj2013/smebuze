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

@Entity('transport_vehicle_documents')
export class VehicleDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  vehicle_id: string;

  @ManyToOne(() => TransportVehicle, (v) => v.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: TransportVehicle;

  @Column({ type: 'varchar', length: 40 })
  doc_type: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  document_number: string | null;

  @Column('date', { nullable: true })
  issued_on: Date | null;

  @Column('date', { nullable: true })
  expires_on: Date | null;

  @Column({ type: 'int', default: 30 })
  remind_days: number;

  @Column('text', { nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
