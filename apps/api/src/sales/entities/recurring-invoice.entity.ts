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
import { Customer } from '../../crm/entities/customer.entity';
import { SalesInvoice } from './sales-invoice.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('recurring_invoices')
export class RecurringInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  company_id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column('uuid', { nullable: true })
  customer_id: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ type: 'varchar', length: 20, default: 'RINV' })
  number_prefix: string;

  @Column({ type: 'varchar', length: 20 })
  frequency: string;

  @Column('date')
  next_run_at: Date;

  @Column('date', { nullable: true })
  last_run_at: Date | null;

  @Column('uuid', { nullable: true })
  template_invoice_id: string | null;

  @ManyToOne(() => SalesInvoice, { nullable: true })
  @JoinColumn({ name: 'template_invoice_id' })
  template_invoice: SalesInvoice | null;

  @Column({ default: true })
  is_active: boolean;

  @Column('uuid', { nullable: true })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
