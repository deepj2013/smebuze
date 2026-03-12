import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { JournalEntry } from './journal-entry.entity';
import { ChartOfAccounts } from './chart-of-accounts.entity';

@Entity('journal_entry_lines')
export class JournalEntryLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  journal_id: string;

  @ManyToOne(() => JournalEntry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journal_id' })
  journal: JournalEntry;

  @Column('uuid')
  account_id: string;

  @ManyToOne(() => ChartOfAccounts)
  @JoinColumn({ name: 'account_id' })
  account: ChartOfAccounts;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  debit: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  credit: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  narration: string | null;

  @Column({ default: 0 })
  sort_order: number;
}
