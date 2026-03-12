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
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Company } from '../../tenant/entities/company.entity';
import { Branch } from '../../tenant/entities/branch.entity';
import { Customer } from '../../crm/entities/customer.entity';
import { Vendor } from '../../purchase/entities/vendor.entity';
import { User } from '../../auth/entities/user.entity';
import { SalesInvoiceLine } from './sales-invoice-line.entity';

@Entity('sales_invoices')
export class SalesInvoice {
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
  branch_id: string | null;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch | null;

  @Column({ type: 'varchar', length: 50 })
  number: string;

  @Column('uuid', { nullable: true })
  customer_id: string | null;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column('uuid', { nullable: true })
  vendor_id: string | null;

  @ManyToOne(() => Vendor, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor | null;

  @Column('date')
  invoice_date: Date;

  @Column('date', { nullable: true })
  due_date: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  subtotal: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  tax_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  total: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  paid_amount: string;

  @Column('uuid', { nullable: true })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => SalesInvoiceLine, (l) => l.invoice)
  lines: SalesInvoiceLine[];
}
