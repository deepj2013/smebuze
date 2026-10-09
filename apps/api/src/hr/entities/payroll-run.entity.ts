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
import { PayrollLine } from './payroll-line.entity';

@Entity('payroll_runs')
export class PayrollRun {
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

  @Column('int')
  year: number;

  @Column('int')
  month: number;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  total_gross: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  total_deductions: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  total_net: string;

  @Column('text', { nullable: true })
  notes: string | null;

  @Column('uuid', { nullable: true })
  created_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  finalized_at: Date | null;

  @OneToMany(() => PayrollLine, (l) => l.payroll_run)
  lines: PayrollLine[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
