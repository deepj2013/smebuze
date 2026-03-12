import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Company } from '../../tenant/entities/company.entity';
import { Customer } from '../../crm/entities/customer.entity';

@Entity('amc_contracts')
export class AmcContract {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') tenant_id: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column('uuid') company_id: string;
  @ManyToOne(() => Company, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'company_id' }) company: Company;
  @Column('uuid') customer_id: string;
  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'customer_id' }) customer: Customer;
  @Column({ type: 'varchar', length: 50 }) contract_number: string;
  @Column('date') start_date: Date;
  @Column('date') end_date: Date;
  @Column('date', { nullable: true }) renewal_date: Date | null;
  @Column('decimal', { precision: 18, scale: 2, default: 0 }) amount: string;
  @Column({ type: 'varchar', length: 20, default: 'active' }) status: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
