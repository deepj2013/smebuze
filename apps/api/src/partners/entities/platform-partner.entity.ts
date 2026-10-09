import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('platform_partners')
export class PlatformPartner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** Coupon / referral code (case-insensitive match). */
  @Column({ type: 'varchar', length: 40, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contact_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact_email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contact_phone: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 20 })
  commission_percent: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column('uuid', { nullable: true })
  user_id: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
