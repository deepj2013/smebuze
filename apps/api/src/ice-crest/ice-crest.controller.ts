import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IceCrestService, ICE_CREST_EXPENSE_CATEGORIES } from './ice-crest.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { Public } from '../common/decorators/public';

@Controller('ice-crest')
export class IceCrestController {
  constructor(private readonly service: IceCrestService) {}
  @Get('expense-categories') @UseGuards(JwtAuthGuard, TenantGuard) categories() { return ICE_CREST_EXPENSE_CATEGORIES; }
  @Post('expenses') @UseGuards(JwtAuthGuard, TenantGuard) createExpense(@Body() body: Parameters<IceCrestService['createExpense']>[0], @CurrentTenant() ctx: TenantContext) { return this.service.createExpense(body, ctx); }
  @Get('expenses') @UseGuards(JwtAuthGuard, TenantGuard) expenses(@Query('from') from: string, @Query('to') to: string, @Query('category') category: string, @CurrentTenant() ctx: TenantContext) { return this.service.listExpenses(from, to, category, ctx); }
  @Post('expenses/:id/payment') @UseGuards(JwtAuthGuard, TenantGuard) payExpense(@Param('id') id:string,@Body() body:{amount:number;payment_mode?:string;reference?:string},@CurrentTenant() ctx:TenantContext){return this.service.recordExpensePayment(id,body,ctx)}
  @Post('stock-movements') @UseGuards(JwtAuthGuard, TenantGuard) movement(@Body() body: Parameters<IceCrestService['recordMovement']>[0], @CurrentTenant() ctx: TenantContext) { return this.service.recordMovement(body, ctx); }
  @Get('stock-movements') @UseGuards(JwtAuthGuard, TenantGuard) movements(@Query('from') from: string, @Query('to') to: string, @Query('item_id') itemId: string, @CurrentTenant() ctx: TenantContext) { return this.service.listMovements(from, to, itemId, ctx); }
  @Get('dashboard') @UseGuards(JwtAuthGuard, TenantGuard) dashboard(@Query('from') from: string, @Query('to') to: string, @CurrentTenant() ctx: TenantContext) { const today = new Date().toISOString().slice(0,10); return this.service.dashboard(from || `${today.slice(0,7)}-01`, to || today, ctx); }
  @Get('production-plan') @UseGuards(JwtAuthGuard, TenantGuard) productionPlan(@Query('date') date: string, @Query('safety_stock') safetyStock: string, @CurrentTenant() ctx: TenantContext) { return this.service.productionPlan(date, Number(safetyStock ?? 0), ctx); }
  @Public() @Post('website-leads') websiteLead(@Body() body: { tenant_slug: string; name: string; phone?: string; email?: string; company?: string; requirement?: string; quantity?: number; product_sku?: string; message?: string }) { return this.service.captureWebsiteLead(body.tenant_slug, body); }
}
