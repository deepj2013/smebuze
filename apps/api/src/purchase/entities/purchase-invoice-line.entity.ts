import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PurchaseInvoice } from './purchase-invoice.entity';
import { Item } from '../../inventory/entities/item.entity';

@Entity('purchase_invoice_lines')
export class PurchaseInvoiceLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  purchase_invoice_id: string;

  @ManyToOne(() => PurchaseInvoice, (inv) => inv.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_invoice_id' })
  purchase_invoice: PurchaseInvoice;

  @Column('uuid', { nullable: true })
  item_id: string | null;

  @ManyToOne(() => Item, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'item_id' })
  item: Item | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  qty: string;

  @Column({ type: 'varchar', length: 20, default: 'pcs' })
  unit: string;

  @Column('decimal', { precision: 18, scale: 4, default: 0 })
  unit_cost: string;

  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  cgst_rate: string;

  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  sgst_rate: string;

  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  igst_rate: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  taxable_value: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  cgst_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  sgst_amount: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  igst_amount: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  batch_code: string | null;

  @Column('date', { nullable: true })
  expiry_date: Date | null;

  @Column({ default: 0 })
  sort_order: number;
}
