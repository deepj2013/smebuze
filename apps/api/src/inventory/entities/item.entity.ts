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

  /** MRP / default selling price when no client-specific rate is set. */
  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  mrp: string | null;

  /** Tax rate % applied on this item (e.g. 0, 5, 12, 18, 28 for GST). Used for tax calculation. */
  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  tax_rate: string;

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
