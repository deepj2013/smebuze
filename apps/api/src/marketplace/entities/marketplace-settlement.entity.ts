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

@Entity('marketplace_settlements')
export class MarketplaceSettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'date' })
  period_start: string;

  @Column({ type: 'date' })
  period_end: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  gross_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  commission_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  delivery_fees: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  net_amount: string;

  @Column({ type: 'varchar', length: 30, default: 'open' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_reference: string | null;

  @Column('text', { nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
