import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalesInvoice } from './sales-invoice.entity';

@Entity('invoice_payments')
export class InvoicePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  invoice_id: string;

  @ManyToOne(() => SalesInvoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: SalesInvoice;

  @Column('decimal', { precision: 18, scale: 2 })
  amount: string;

  @Column('date')
  payment_date: Date;

  @Column({ type: 'varchar', length: 50, default: 'cash' })
  mode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @CreateDateColumn()
  created_at: Date;
}
