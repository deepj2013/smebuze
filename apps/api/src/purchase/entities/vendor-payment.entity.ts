import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Vendor } from './vendor.entity';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('vendor_payments')
export class VendorPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  vendor_id: string;

  @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column('uuid', { nullable: true })
  purchase_order_id: string | null;

  @ManyToOne(() => PurchaseOrder, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder | null;

  @Column('decimal', { precision: 18, scale: 2 })
  amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: '0' })
  tds_amount: string;

  @Column('decimal', { precision: 5, scale: 2, default: '0' })
  tds_percent: string;

  @Column('date')
  payment_date: Date;

  @Column({ type: 'varchar', length: 50, default: 'cash' })
  mode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @CreateDateColumn()
  created_at: Date;
}
