import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bde_leads')
export class BdeLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  owner_user_id: string;

  @Column({ type: 'varchar', length: 255 })
  company_name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contact_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact_email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contact_phone: string | null;

  /** new | contacted | demo | negotiation | won | lost */
  @Column({ type: 'varchar', length: 40, default: 'new' })
  status: string;

  @Column({ type: 'int', nullable: true })
  estimated_price_rupees: number | null;

  @Column({ type: 'varchar', length: 40, default: 'basic' })
  plan: string;

  @Column({ type: 'varchar', length: 20, default: 'quarterly' })
  billing_interval: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 40, default: 'outbound' })
  source: string;

  @Column('uuid', { nullable: true })
  converted_tenant_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
