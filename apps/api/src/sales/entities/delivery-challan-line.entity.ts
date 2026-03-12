import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DeliveryChallan } from './delivery-challan.entity';
import { Item } from '../../inventory/entities/item.entity';

/**
 * Line items on a delivery challan. Used when tenant.settings.business_type = 'restaurant_wholesale'
 * to support per-customer unit_price at delivery (different from item MRP).
 */
@Entity('delivery_challan_lines')
export class DeliveryChallanLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  delivery_challan_id: string;

  @ManyToOne(() => DeliveryChallan, (dc) => dc.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_challan_id' })
  deliveryChallan: DeliveryChallan;

  @Column('uuid', { nullable: true })
  item_id: string | null;

  @ManyToOne(() => Item, { nullable: true })
  @JoinColumn({ name: 'item_id' })
  item: Item | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  quantity: string;

  @Column({ type: 'varchar', length: 20, default: 'pcs' })
  unit: string;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  unit_price: string;

  @Column('int', { default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;
}
