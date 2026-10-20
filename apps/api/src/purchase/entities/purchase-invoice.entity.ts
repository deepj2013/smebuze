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
import { Vendor } from './vendor.entity';
import { Warehouse } from '../../inventory/entities/warehouse.entity';
import { PurchaseInvoiceLine } from './purchase-invoice-line.entity';

@Entity('purchase_invoices')
export class PurchaseInvoice {
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

  @Column('uuid')
  vendor_id: string;

  @ManyToOne(() => Vendor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column('uuid', { nullable: true })
  warehouse_id: string | null;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse | null;

  @Column({ type: 'varchar', length: 50 })
  number: string;

  @Column('date')
  bill_date: Date;

  @Column({ type: 'varchar', length: 80, nullable: true })
  vendor_bill_no: string | null;

  @Column({ type: 'varchar', length: 30, default: 'posted' })
  status: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  taxable_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  cgst_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  sgst_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  igst_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  total: string;

  @Column('text', { nullable: true })
  notes: string | null;

  @Column({ default: false })
  stock_received: boolean;

  @Column('uuid', { nullable: true })
  created_by: string | null;

  @OneToMany(() => PurchaseInvoiceLine, (l) => l.purchase_invoice)
  lines: PurchaseInvoiceLine[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
