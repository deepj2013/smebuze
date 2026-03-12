import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Company } from '../../tenant/entities/company.entity';
import { Customer } from '../../crm/entities/customer.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('service_tickets')
export class ServiceTicket {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') tenant_id: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column('uuid') company_id: string;
  @ManyToOne(() => Company, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'company_id' }) company: Company;
  @Column('uuid', { nullable: true }) customer_id: string | null;
  @ManyToOne(() => Customer, { nullable: true }) @JoinColumn({ name: 'customer_id' }) customer: Customer | null;
  @Column({ type: 'varchar', length: 50 }) number: string;
  @Column({ type: 'varchar', length: 255 }) subject: string;
  @Column('text', { nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 30, default: 'open' }) status: string;
  @Column({ type: 'varchar', length: 20, default: 'medium' }) priority: string;
  @Column('uuid', { nullable: true }) assigned_to: string | null;
  @ManyToOne(() => User, { nullable: true }) @JoinColumn({ name: 'assigned_to' }) assignedTo: User | null;
  @Column('uuid', { nullable: true }) created_by: string | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
