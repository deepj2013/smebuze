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

@Entity('storefront_sites')
export class StorefrontSite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  custom_domain: string | null;

  /** none | pending_dns | active | disabled */
  @Column({ type: 'varchar', length: 30, default: 'none' })
  domain_status: string;

  @Column('text', { nullable: true })
  domain_notes: string | null;

  @Column({ default: false })
  is_published: boolean;

  @Column({ default: true })
  shop_enabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  theme: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  pages: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
