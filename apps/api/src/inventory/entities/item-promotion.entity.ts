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
import { Item } from './item.entity';

@Entity('item_promotions')
export class ItemPromotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** bogo = buy N get M free */
  @Column({ type: 'varchar', length: 30, default: 'bogo' })
  promo_type: string;

  @Column('uuid')
  buy_item_id: string;

  @ManyToOne(() => Item, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buy_item_id' })
  buy_item: Item;

  @Column('decimal', { precision: 18, scale: 4, default: 1 })
  buy_qty: string;

  @Column('uuid', { nullable: true })
  free_item_id: string | null;

  @ManyToOne(() => Item, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'free_item_id' })
  free_item: Item | null;

  @Column('decimal', { precision: 18, scale: 4, default: 1 })
  free_qty: string;

  @Column({ default: true })
  is_active: boolean;

  @Column('date', { nullable: true })
  starts_on: string | null;

  @Column('date', { nullable: true })
  ends_on: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
