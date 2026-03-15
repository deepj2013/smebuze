import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { Item } from '../../inventory/entities/item.entity';

@Entity('sales_order_lines')
export class SalesOrderLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sales_order_id: string;

  @ManyToOne(() => SalesOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrder;

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
  rate: string;

  /** MRP at time of requirement (from item or override). */
  @Column('decimal', { precision: 18, scale: 4, nullable: true })
  mrp: string | null;

  /** Discount % offered (derived from MRP vs rate, or entered). */
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  discount_percent: string | null;

  /** Whether rate is inclusive of GST or GST is extra. Affects tax calculation. */
  @Column({ type: 'varchar', length: 20, default: 'extra' })
  gst_treatment: string;

  @Column('int', { default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;
}
