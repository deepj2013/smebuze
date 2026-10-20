import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HubOrder } from './hub-order.entity';
import { HubCatalogItem } from './hub-catalog-item.entity';
import { Item } from '../../inventory/entities/item.entity';

@Entity('hub_order_lines')
export class HubOrderLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  hub_order_id: string;

  @ManyToOne(() => HubOrder, (o) => o.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hub_order_id' })
  hubOrder: HubOrder;

  @Column('uuid')
  hub_item_id: string;

  @ManyToOne(() => HubCatalogItem)
  @JoinColumn({ name: 'hub_item_id' })
  hubItem: HubCatalogItem;

  @Column('uuid', { nullable: true })
  item_id: string | null;

  @ManyToOne(() => Item, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'item_id' })
  item: Item | null;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column('decimal', { precision: 18, scale: 4 })
  qty: string;

  @Column({ type: 'varchar', length: 20, default: 'pcs' })
  unit: string;

  @Column('decimal', { precision: 18, scale: 2 })
  wholesale_price: string;

  @Column('decimal', { precision: 18, scale: 2 })
  line_total: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;
}
