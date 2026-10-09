import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('platform_commissions')
export class PlatformCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  partner_id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid', { nullable: true })
  payment_id: string | null;

  @Column({ type: 'int', default: 0 })
  amount_paise: number;

  @Column({ type: 'int', default: 0 })
  commission_paise: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
