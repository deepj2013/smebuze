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
import { Company } from '../../tenant/entities/company.entity';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid', { nullable: true })
  company_id: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode: string | null;

  @Column({ type: 'jsonb', default: [] })
  image_urls: string[];

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pcs' })
  unit: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  hsn_sac: string | null;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  reorder_level: string;

  /** MRP printed on the pack. */
  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  mrp: string | null;

  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  cost_price: string | null;

  /** Counter selling price before optional discount. */
  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  sale_price: string | null;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  discount_percent: string | null;

  /** Combined GST % (cgst_rate + sgst_rate). Used by POS and older clients. */
  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  tax_rate: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  cgst_rate: string | null;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  sgst_rate: string | null;

  /** When true, item appears on invoices, orders and quotations. */
  @Column({ default: true })
  for_sale: boolean;

  /** When true, item can be consumed via stock movements / production. */
  @Column({ default: true })
  for_consume: boolean;

  @Column({ type: 'varchar', length: 20, default: 'fifo' })
  valuation_method: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
