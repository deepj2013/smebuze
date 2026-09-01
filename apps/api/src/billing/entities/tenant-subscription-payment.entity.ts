import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tenant_subscription_payments')
@Index(['tenant_id'])
@Index(['gateway_order_id'])
export class TenantSubscriptionPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column({ type: 'varchar', length: 20 })
  gateway: string;

  @Column({ type: 'varchar', length: 50 })
  plan: string;

  @Column({ type: 'varchar', length: 20 })
  interval: string;

  @Column('int')
  amount_paise: number;

  @Column({ type: 'varchar', length: 20, default: 'created' })
  status: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  gateway_order_id: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  gateway_payment_id: string | null;

  @Column({ type: 'jsonb', default: {} })
  meta: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
