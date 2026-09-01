import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('gstr2a_invoices')
export class Gstr2aInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid', { nullable: true })
  company_id: string | null;

  @Column({ type: 'varchar', length: 7 })
  period: string;

  @Column({ type: 'varchar', length: 15 })
  supplier_gstin: string;

  @Column({ type: 'varchar', length: 50 })
  invoice_number: string;

  @Column('date')
  invoice_date: Date;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  taxable_value: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  cgst: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  sgst: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  igst: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  invoice_value: string;

  @Column({ type: 'varchar', length: 20, default: 'b2b' })
  source_table: string;

  @CreateDateColumn()
  created_at: Date;
}
