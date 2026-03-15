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
import { Quotation } from './quotation.entity';
import { User } from '../../auth/entities/user.entity';
import { SalesOrderLine } from './sales-order-line.entity';

@Entity('sales_orders')
export class SalesOrder {
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
  quotation_id: string | null;

  @ManyToOne(() => Quotation, { nullable: true })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation | null;

  @Column('date')
  order_date: Date;

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

  /** Who gave the requirement (e.g. contact person name at customer). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  requirement_given_by: string | null;

  /** How the requirement was communicated: phone, whatsapp, email, in_person, other. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  requirement_channel: string | null;

  /** Proof or reference (e.g. "WhatsApp screenshot", "Call ref #123"). */
  @Column({ type: 'varchar', length: 500, nullable: true })
  requirement_proof_ref: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => SalesOrderLine, (l) => l.salesOrder)
  lines: SalesOrderLine[];
}
