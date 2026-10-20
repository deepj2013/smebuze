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
import { HubOrderLine } from './hub-order-line.entity';

@Entity('hub_orders')
export class HubOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 40 })
  number: string;

  @Column({ type: 'varchar', length: 30, default: 'placed' })
  status: string;

  @Column({ type: 'varchar', length: 30, default: 'manual' })
  source: string;

  @Column({ type: 'date', nullable: true })
  delivery_date: string | null;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  delivery_charge: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  subtotal: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  total: string;

  @Column('text', { nullable: true })
  notes: string | null;

  @Column('text', { nullable: true })
  admin_notes: string | null;

  @Column('uuid', { nullable: true })
  warehouse_id: string | null;

  @Column({ default: false })
  stock_received: boolean;

  @Column('uuid', { nullable: true })
  created_by: string | null;

  @OneToMany(() => HubOrderLine, (l) => l.hubOrder)
  lines: HubOrderLine[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
