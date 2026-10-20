import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('hub_catalog_items')
export class HubCatalogItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pack_label: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku: string | null;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  wholesale_price: string;

  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  mrp: string | null;

  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  cost_price: string | null;

  @Column({ type: 'int', default: 2 })
  eta_days: number;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  delivery_charge: string;

  @Column({ type: 'jsonb', default: [] })
  business_types: string[];

  @Column('text', { nullable: true })
  image_url: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pcs' })
  unit: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
