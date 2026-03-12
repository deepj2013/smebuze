import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalesInvoice } from './sales-invoice.entity';
import { Item } from '../../inventory/entities/item.entity';

@Entity('sales_invoice_lines')
export class SalesInvoiceLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  invoice_id: string;

  @ManyToOne(() => SalesInvoice, (inv) => inv.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: SalesInvoice;

  @Column('uuid', { nullable: true })
  item_id: string | null;

  @ManyToOne(() => Item, { nullable: true })
  @JoinColumn({ name: 'item_id' })
  item: Item | null;

  @Column({ type: 'varchar', length: 20 })
  hsn_sac: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column('decimal', { precision: 18, scale: 4 })
  qty: string;

  @Column({ type: 'varchar', length: 20, default: 'pcs' })
  unit: string;

  @Column('decimal', { precision: 18, scale: 4 })
  rate: string;

  @Column('decimal', { precision: 18, scale: 2 })
  taxable_value: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  cgst_rate: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  cgst_amount: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  sgst_rate: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  sgst_amount: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  igst_rate: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  igst_amount: string;

  @Column({ default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;
}
