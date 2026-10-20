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
import { MarketplaceOrder } from './marketplace-order.entity';
import { HubOrder } from './hub-order.entity';

@Entity('delivery_jobs')
export class DeliveryJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  marketplace_order_id: string | null;

  @ManyToOne(() => MarketplaceOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'marketplace_order_id' })
  marketplaceOrder: MarketplaceOrder | null;

  @Column('uuid', { nullable: true })
  hub_order_id: string | null;

  @ManyToOne(() => HubOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hub_order_id' })
  hubOrder: HubOrder | null;

  @Column('uuid', { nullable: true })
  seller_tenant_id: string | null;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'seller_tenant_id' })
  sellerTenant: Tenant | null;

  @Column('text', { nullable: true })
  pickup_label: string | null;

  @Column({ type: 'jsonb', default: {} })
  drop_address: Record<string, unknown>;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  fee: string;

  @Column({ type: 'varchar', length: 30, default: 'queued' })
  status: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  rider_name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  rider_phone: string | null;

  @Column('text', { nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
