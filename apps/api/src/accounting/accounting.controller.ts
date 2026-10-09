import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('accounting')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('coa')
  @RequirePermissions('accounting.coa.view')
  async getChartOfAccounts(@Query('company_id') companyId: string, @CurrentTenant() ctx: TenantContext) {
    return this.accountingService.findChartOfAccounts(ctx, companyId);
  }

  @Post('coa')
  @RequirePermissions('accounting.journal.create')
  async createAccount(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.accountingService.createAccount(ctx, body as Parameters<AccountingService['createAccount']>[1]);
  }

  @Post('coa/seed-system')
  @RequirePermissions('accounting.journal.create')
  async seedCoa(@Body() body: { company_id: string }, @CurrentTenant() ctx: TenantContext) {
    return this.accountingService.seedSystemAccounts(ctx, body.company_id);
  }

  @Get('trial-balance')
  @RequirePermissions('accounting.coa.view')
  async trialBalance(
    @Query('company_id') companyId: string,
    @Query('as_of') asOf: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.accountingService.trialBalance(ctx, companyId, asOf);
  }

  @Post('journal')
  @RequirePermissions('accounting.journal.create')
  async createJournalEntry(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.accountingService.createJournalEntry(body as Parameters<AccountingService['createJournalEntry']>[0], ctx);
  }

  @Get('journal')
  @RequirePermissions('accounting.journal.view')
  async getJournalEntries(@Query('company_id') companyId: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.accountingService.findJournalEntries(ctx, companyId);
  }

  @Get('bank-statement-lines')
  @RequirePermissions('accounting.journal.view')
  async getBankStatementLines(@Query('company_id') companyId: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.accountingService.findBankStatementLines(ctx, companyId);
  }

  @Post('bank-statement-lines')
  @RequirePermissions('accounting.journal.create')
  async createBankStatementLine(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.accountingService.createBankStatementLine(ctx, body as Parameters<AccountingService['createBankStatementLine']>[1]);
  }

  @Post('bank-statement-lines/bulk')
  @RequirePermissions('accounting.journal.create')
  async bulkBankLines(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.accountingService.bulkCreateBankLines(ctx, body as Parameters<AccountingService['bulkCreateBankLines']>[1]);
  }

  @Get('bank-statement-lines/suggestions')
  @RequirePermissions('accounting.journal.view')
  async bankSuggestions(@Query('company_id') companyId: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.accountingService.suggestBankMatches(ctx, companyId);
  }

  @Post('bank-statement-lines/:id/reconcile')
  @RequirePermissions('accounting.journal.create')
  async reconcileBankLine(
    @Param('id') id: string,
    @Body() body: { journal_entry_id: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.accountingService.reconcileBankLine(ctx, id, body.journal_entry_id);
  }

  @Post('bank-statement-lines/:id/unreconcile')
  @RequirePermissions('accounting.journal.create')
  async unreconcileBankLine(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.accountingService.unreconcileBankLine(ctx, id);
  }
}
