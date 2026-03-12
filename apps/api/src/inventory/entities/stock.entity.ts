import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Warehouse } from './warehouse.entity';
import { Item } from './item.entity';

@Entity('stock')
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  warehouse_id: string;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column('uuid')
  item_id: string;

  @ManyToOne(() => Item, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  quantity: string;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  reserved: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  batch_code: string | null;

  @Column('date', { nullable: true })
  expiry_date: Date | null;

  @UpdateDateColumn()
  updated_at: Date;
}
