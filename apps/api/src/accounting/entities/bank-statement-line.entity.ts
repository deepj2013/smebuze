import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../tenant/entities/company.entity';

@Entity('bank_statement_lines')
export class BankStatementLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  company_id: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'varchar', length: 255, nullable: true })
  statement_ref: string | null;

  @Column('date')
  line_date: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column('decimal', { precision: 18, scale: 2 })
  amount: string;

  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  balance_after: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  external_id: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reconciled_at: Date | null;

  @Column('uuid', { nullable: true })
  journal_entry_id: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_ref_type: string | null;

  @Column('uuid', { nullable: true })
  payment_ref_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
