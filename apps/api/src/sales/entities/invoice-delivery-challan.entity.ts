import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalesInvoice } from './sales-invoice.entity';
import { DeliveryChallan } from './delivery-challan.entity';

/**
 * Links a sales invoice to one or more delivery challans. Used when tenant.settings.business_type
 * = 'restaurant_wholesale' for consolidated monthly invoice from multiple challans.
 */
@Entity('invoice_delivery_challans')
export class InvoiceDeliveryChallan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  invoice_id: string;

  @ManyToOne(() => SalesInvoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: SalesInvoice;

  @Column('uuid')
  delivery_challan_id: string;

  @ManyToOne(() => DeliveryChallan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'delivery_challan_id' })
  deliveryChallan: DeliveryChallan;

  @CreateDateColumn()
  created_at: Date;
}
