import { Entity, Column, UpdateDateColumn, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('tenant_commerce_settings')
export class TenantCommerceSettings {
  @PrimaryColumn('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ default: false })
  storefront_enabled: boolean;

  @Column({ default: false })
  mall_enabled: boolean;

  @Column({ default: true })
  restock_hub_enabled: boolean;

  @Column({ type: 'varchar', length: 20, default: 'own' })
  delivery_mode: string;

  /** platform_collect | tenant_razorpay | upi_qr */
  @Column({ type: 'varchar', length: 30, default: 'tenant_razorpay' })
  payment_mode: string;

  @Column('decimal', { precision: 5, scale: 2, default: 2.5 })
  commission_pct: string;

  /** When true, customer pays bill + fee so shop nets the bill. */
  @Column({ default: true })
  pass_fee_to_customer: boolean;

  /** Static UPI QR image for payment_mode=upi_qr */
  @Column('text', { nullable: true })
  upi_qr_image_url: string | null;

  /** Business days after capture before settlement is due (T+1). */
  @Column({ type: 'int', default: 1 })
  settle_days: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  listing_fee_monthly: string;

  @Column({ type: 'timestamptz', nullable: true })
  storefront_paid_until: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  mall_paid_until: Date | null;

  @Column({ type: 'jsonb', default: {} })
  addons_meta: Record<string, unknown>;

  @Column({ type: 'varchar', length: 6, nullable: true })
  mall_origin_pincode: string | null;

  /** local | city | pincode_list | pan_india */
  @Column({ type: 'varchar', length: 20, default: 'local' })
  mall_coverage: string;

  @Column({ type: 'jsonb', default: [] })
  mall_extra_pincodes: string[];

  @UpdateDateColumn()
  updated_at: Date;
}
