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

@Entity('tenant_billing_mandates')
export class TenantBillingMandate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 30, default: 'razorpay' })
  gateway: string;

  /** created | authenticated | active | halted | cancelled */
  @Column({ type: 'varchar', length: 30, default: 'created' })
  status: string;

  @Column({ type: 'varchar', length: 40 })
  plan: string;

  @Column({ type: 'varchar', length: 20, default: 'quarterly' })
  interval: string;

  @Column({ type: 'int', default: 0 })
  amount_paise: number;

  @Column({ type: 'varchar', length: 80, nullable: true })
  gateway_plan_id: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  gateway_subscription_id: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  gateway_customer_id: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  mandate_token: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  next_charge_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_charged_at: Date | null;

  @Column({ type: 'jsonb', default: {} })
  meta: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
