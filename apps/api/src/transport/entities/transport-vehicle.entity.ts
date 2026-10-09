import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { VehicleDocument } from './vehicle-document.entity';

@Entity('transport_vehicles')
export class TransportVehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid', { nullable: true })
  company_id: string | null;

  @Column({ type: 'varchar', length: 40 })
  registration_no: string;

  @Column({ type: 'varchar', length: 40, default: 'truck' })
  vehicle_type: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  make_model: string | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  capacity_tons: string | null;

  @Column({ type: 'varchar', length: 20, default: 'owned' })
  ownership: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  driver_name: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  helper_name: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column('text', { nullable: true })
  notes: string | null;

  @OneToMany(() => VehicleDocument, (d) => d.vehicle)
  documents: VehicleDocument[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
