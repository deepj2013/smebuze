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
import { SalesOrder } from './sales-order.entity';
import { SalesInvoice } from './sales-invoice.entity';
import { User } from '../../auth/entities/user.entity';
import { DeliveryChallanLine } from './delivery-challan-line.entity';

@Entity('delivery_challans')
export class DeliveryChallan {
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
  order_id: string | null;

  @ManyToOne(() => SalesOrder, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: SalesOrder | null;

  @Column('uuid', { nullable: true })
  invoice_id: string | null;

  @ManyToOne(() => SalesInvoice, { nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice: SalesInvoice | null;

  @Column('date')
  challan_date: Date;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column('uuid', { nullable: true })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  /** Optional: URL of signed challan image (used when tenant.settings.business_type = 'restaurant_wholesale'). */
  @Column({ type: 'varchar', length: 1024, nullable: true })
  signed_challan_image_url: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => DeliveryChallanLine, (l) => l.deliveryChallan)
  lines: DeliveryChallanLine[];
}
