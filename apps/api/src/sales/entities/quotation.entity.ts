import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Company } from '../../tenant/entities/company.entity';
import { Branch } from '../../tenant/entities/branch.entity';
import { Customer } from '../../crm/entities/customer.entity';
import { Lead } from '../../crm/entities/lead.entity';
import { User } from '../../auth/entities/user.entity';
import { QuotationItem } from './quotation-item.entity';

@Entity('quotations')
export class Quotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  company_id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column('uuid', { nullable: true })
  branch_id: string | null;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch | null;

  @Column({ type: 'varchar', length: 50 })
  number: string;

  @Column('uuid', { nullable: true })
  customer_id: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column('uuid', { nullable: true })
  lead_id: string | null;

  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead | null;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at: Date | null;

  @Column('date')
  issue_date: Date;

  @Column('date', { nullable: true })
  valid_until: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  total: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  tax_amount: string;

  @Column('uuid', { nullable: true })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => QuotationItem, (item) => item.quotation)
  items: QuotationItem[];
}
