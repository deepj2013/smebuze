import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChartOfAccounts } from './entities/chart-of-accounts.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { BankStatementLine } from './entities/bank-statement-line.entity';
import { TenantContext } from '../common/tenant-context';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(ChartOfAccounts)
    private readonly coaRepo: Repository<ChartOfAccounts>,
    @InjectRepository(JournalEntry)
    private readonly journalRepo: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine)
    private readonly lineRepo: Repository<JournalEntryLine>,
    @InjectRepository(BankStatementLine)
    private readonly bankLineRepo: Repository<BankStatementLine>,
  ) {}

  private assertTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant context required');
    return ctx.tenantId;
  }

  async findChartOfAccounts(ctx: TenantContext, companyId: string) {
    const tenantId = this.assertTenantId(ctx);
    return this.coaRepo.find({
      where: { tenant_id: tenantId, company_id: companyId },
      order: { code: 'ASC' },
    });
  }

  private readonly systemAccounts: Array<{ code: string; name: string; type: string }> = [
    { code: 'SB-CASH', name: 'Cash', type: 'asset' },
    { code: 'SB-BANK', name: 'Bank', type: 'asset' },
    { code: 'SB-AP', name: 'Accounts payable', type: 'liability' },
    { code: 'SB-TDS', name: 'TDS payable', type: 'liability' },
    { code: 'SB-ITC', name: 'Input GST (ITC)', type: 'asset' },
    { code: 'SB-EXP-PROD', name: 'Production / productivity expenses', type: 'expense' },
    { code: 'SB-EXP-OPS', name: 'Operating expenses', type: 'expense' },
    { code: 'SB-EXP-SELL', name: 'Selling & marketing expenses', type: 'expense' },
    { code: 'SB-EXP-ADM', name: 'Administration expenses', type: 'expense' },
    { code: 'SB-EXP-FIN', name: 'Finance & bank charges', type: 'expense' },
    { code: 'SB-EXP-STAT', name: 'Statutory payments', type: 'expense' },
    { code: 'SB-PPE', name: 'Plant, machinery & assets', type: 'asset' },
  ];

  async ensureSystemAccounts(ctx: TenantContext, companyId: string): Promise<Record<string, ChartOfAccounts>> {
    const tenantId = this.assertTenantId(ctx);
    const existing = await this.coaRepo.find({ where: { tenant_id: tenantId, company_id: companyId } });
    const byCode: Record<string, ChartOfAccounts> = {};
    for (const row of existing) byCode[row.code] = row;
    for (const def of this.systemAccounts) {
      if (byCode[def.code]) continue;
      const saved = await this.coaRepo.save(
        this.coaRepo.create({
          tenant_id: tenantId,
          company_id: companyId,
          code: def.code,
          name: def.name,
          type: def.type,
          is_system: true,
        }),
      );
      byCode[def.code] = saved;
    }
    return byCode;
  }

  async postBalancedEntry(
    ctx: TenantContext,
    dto: {
      company_id: string;
      entry_date: string | Date;
      number?: string;
      reference?: string;
      lines: Array<{ code: string; debit?: number; credit?: number; narration?: string }>;
    },
  ): Promise<JournalEntry> {
    const tenantId = this.assertTenantId(ctx);
    const accounts = await this.ensureSystemAccounts(ctx, dto.company_id);
    const lines = dto.lines
      .map((l) => ({
        ...l,
        debit: Math.round((l.debit ?? 0) * 100) / 100,
        credit: Math.round((l.credit ?? 0) * 100) / 100,
      }))
      .filter((l) => l.debit >= 0.01 || l.credit >= 0.01);
    const totalDebit = Math.round(lines.reduce((s, l) => s + l.debit, 0) * 100) / 100;
    const totalCredit = Math.round(lines.reduce((s, l) => s + l.credit, 0) * 100) / 100;
    if (!lines.length || Math.abs(totalDebit - totalCredit) > 0.05) {
      throw new ForbiddenException('Journal is not balanced');
    }
    const entry = await this.journalRepo.save(
      this.journalRepo.create({
        tenant_id: tenantId,
        company_id: dto.company_id,
        number: dto.number ?? `JE-${Date.now()}`,
        entry_date: dto.entry_date instanceof Date ? dto.entry_date : new Date(dto.entry_date),
        reference: dto.reference ?? null,
        status: 'posted',
        total_debit: totalDebit.toFixed(2),
        total_credit: totalCredit.toFixed(2),
        created_by: ctx.userId,
      }),
    );
    let sort = 0;
    for (const line of lines) {
      const account = accounts[line.code];
      if (!account) throw new ForbiddenException(`Account ${line.code} is missing`);
      await this.lineRepo.save(
        this.lineRepo.create({
          journal_id: entry.id,
          account_id: account.id,
          debit: line.debit.toFixed(2),
          credit: line.credit.toFixed(2),
          narration: line.narration ?? null,
          sort_order: sort++,
        }),
      );
    }
    return entry;
  }

  expenseAccountCode(nature: string): string {
    if (nature === 'production') return 'SB-EXP-PROD';
    if (nature === 'selling') return 'SB-EXP-SELL';
    if (nature === 'admin') return 'SB-EXP-ADM';
    if (nature === 'finance') return 'SB-EXP-FIN';
    if (nature === 'statutory') return 'SB-EXP-STAT';
    if (nature === 'capex') return 'SB-PPE';
    return 'SB-EXP-OPS';
  }

  cashBankCode(mode?: string | null): string {
    const m = String(mode || '').toLowerCase();
    if (m.includes('cash')) return 'SB-CASH';
    return 'SB-BANK';
  }

  async createJournalEntry(
    dto: Partial<{ company_id: string; number: string; entry_date: string; reference: string; total_debit: number; total_credit: number }>,
    ctx: TenantContext,
  ) {
    const tenantId = this.assertTenantId(ctx);
    const entry = this.journalRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id!,
      number: dto.number ?? `JE-${Date.now()}`,
      entry_date: dto.entry_date ? new Date(dto.entry_date) : new Date(),
      reference: dto.reference ?? null,
      total_debit: String(dto.total_debit ?? 0),
      total_credit: String(dto.total_credit ?? 0),
      created_by: ctx.userId,
    });
    return this.journalRepo.save(entry);
  }

  async findJournalEntries(ctx: TenantContext, companyId?: string) {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; company_id?: string } = { tenant_id: tenantId };
    if (companyId) where.company_id = companyId;
    return this.journalRepo.find({ where, order: { entry_date: 'DESC' } });
  }

  async findJournalEntryLinesByPeriod(ctx: TenantContext, from: Date, to: Date, companyId?: string): Promise<{ account_id: string; type: string; debit: number; credit: number }[]> {
    const tenantId = this.assertTenantId(ctx);
    const qb = this.lineRepo
      .createQueryBuilder('l')
      .innerJoin('l.journal', 'j')
      .innerJoin('l.account', 'a')
      .where('j.tenant_id = :tenantId', { tenantId })
      .andWhere('j.entry_date >= :from', { from })
      .andWhere('j.entry_date <= :to', { to })
      .select('l.account_id', 'account_id')
      .addSelect('a.type', 'type')
      .addSelect('l.debit', 'debit')
      .addSelect('l.credit', 'credit');
    if (companyId) qb.andWhere('j.company_id = :companyId', { companyId });
    const rows = await qb.getRawMany();
    return rows.map((r: { account_id: string; type: string; debit: string; credit: string }) => ({
      account_id: r.account_id,
      type: r.type,
      debit: parseFloat(r.debit ?? '0'),
      credit: parseFloat(r.credit ?? '0'),
    }));
  }

  async findJournalEntryLinesAsOf(ctx: TenantContext, asOf: Date, companyId?: string): Promise<{ account_id: string; type: string; debit: number; credit: number }[]> {
    const tenantId = this.assertTenantId(ctx);
    const qb = this.lineRepo
      .createQueryBuilder('l')
      .innerJoin('l.journal', 'j')
      .innerJoin('l.account', 'a')
      .where('j.tenant_id = :tenantId', { tenantId })
      .andWhere('j.entry_date <= :asOf', { asOf })
      .select('l.account_id', 'account_id')
      .addSelect('a.type', 'type')
      .addSelect('l.debit', 'debit')
      .addSelect('l.credit', 'credit');
    if (companyId) qb.andWhere('j.company_id = :companyId', { companyId });
    const rows = await qb.getRawMany();
    return rows.map((r: { account_id: string; type: string; debit: string; credit: string }) => ({
      account_id: r.account_id,
      type: r.type,
      debit: parseFloat(r.debit ?? '0'),
      credit: parseFloat(r.credit ?? '0'),
    }));
  }

  async findBankStatementLines(ctx: TenantContext, companyId?: string): Promise<BankStatementLine[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; company_id?: string } = { tenant_id: tenantId };
    if (companyId) where.company_id = companyId;
    return this.bankLineRepo.find({
      where,
      order: { line_date: 'DESC', created_at: 'DESC' },
      take: 200,
    });
  }

  async createBankStatementLine(
    ctx: TenantContext,
    dto: { company_id: string; statement_ref?: string; line_date: string; description?: string; amount: number; balance_after?: number },
  ): Promise<BankStatementLine> {
    const tenantId = this.assertTenantId(ctx);
    const line = this.bankLineRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id,
      statement_ref: dto.statement_ref ?? null,
      line_date: new Date(dto.line_date),
      description: dto.description ?? null,
      amount: String(dto.amount),
      balance_after: dto.balance_after != null ? String(dto.balance_after) : null,
    });
    return this.bankLineRepo.save(line);
  }

  async reconcileBankLine(ctx: TenantContext, lineId: string, journalEntryId: string): Promise<BankStatementLine> {
    const tenantId = this.assertTenantId(ctx);
    const line = await this.bankLineRepo.findOne({ where: { id: lineId, tenant_id: tenantId } });
    if (!line) throw new NotFoundException('Bank statement line not found');
    line.reconciled_at = new Date();
    line.journal_entry_id = journalEntryId;
    return this.bankLineRepo.save(line);
  }
}
