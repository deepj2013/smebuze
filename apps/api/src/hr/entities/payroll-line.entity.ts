import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Employee } from './employee.entity';
import { PayrollRun } from './payroll-run.entity';

@Entity('payroll_lines')
export class PayrollLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  payroll_run_id: string;

  @ManyToOne(() => PayrollRun, (r) => r.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payroll_run_id' })
  payroll_run: PayrollRun;

  @Column('uuid')
  employee_id: string;

  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'varchar', length: 40, nullable: true })
  slip_number: string | null;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  present_days: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  paid_days: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  leave_days: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  absent_days: string;

  @Column('decimal', { precision: 5, scale: 2, default: 26 })
  working_days: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  basic: string;

  @Column({ type: 'jsonb', default: [] })
  allowances_json: Array<{ name: string; amount: number }>;

  @Column({ type: 'jsonb', default: [] })
  deductions_json: Array<{ name: string; amount: number }>;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  gross: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  deductions_total: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  net: string;

  @Column('uuid', { nullable: true })
  expense_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
