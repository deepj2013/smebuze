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
import { SalesOrder } from '../../sales/entities/sales-order.entity';
import { MarketplaceSettlement } from './marketplace-settlement.entity';

@Entity('marketplace_orders')
export class MarketplaceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  seller_tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_tenant_id' })
  sellerTenant: Tenant;

  @Column('uuid', { nullable: true })
  sales_order_id: string | null;

  @ManyToOne(() => SalesOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrder | null;

  @Column({ type: 'varchar', length: 40, default: 'smebuze_mall' })
  channel: string;

  @Column({ type: 'varchar', length: 32 })
  tracking_token: string;

  @Column({ type: 'varchar', length: 255 })
  buyer_name: string;

  @Column({ type: 'varchar', length: 50 })
  buyer_phone: string;

  @Column({ type: 'jsonb', default: {} })
  buyer_address: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: 'own' })
  delivery_mode: string;

  @Column({ type: 'varchar', length: 30, default: 'platform_collect' })
  payment_mode: string;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  payment_status: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_ref: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  gateway_order_id: string | null;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  gross_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  delivery_fee: string;

  @Column('decimal', { precision: 5, scale: 2, default: 2 })
  commission_pct: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  commission_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  net_to_seller: string;

  @Column('uuid', { nullable: true })
  settlement_id: string | null;

  @ManyToOne(() => MarketplaceSettlement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'settlement_id' })
  settlement: MarketplaceSettlement | null;

  @Column({ type: 'varchar', length: 30, default: 'placed' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
