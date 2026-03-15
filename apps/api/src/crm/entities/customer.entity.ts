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

@Entity('customers')
export class Customer {
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

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** individual | company | other */
  @Column({ type: 'varchar', length: 20, nullable: true, default: 'company' })
  entity_type: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gstin: string | null;

  @Column('uuid', { nullable: true })
  category_id: string | null;

  @Column({ type: 'jsonb', default: {} })
  address: Record<string, unknown>;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  credit_limit: string;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  /** Contact persons: [{ name, email?, phone?, department? }] — e.g. Account, Purchase, Sales */
  @Column({ type: 'jsonb', default: [] })
  contacts: Record<string, unknown>[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  segment: string | null;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
