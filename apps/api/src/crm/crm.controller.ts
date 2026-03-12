import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('crm')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('leads')
  @RequirePermissions('crm.lead.create')
  async createLead(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.createLead(body as Parameters<CrmService['createLead']>[0], ctx);
  }

  @Get('leads')
  @RequirePermissions('crm.lead.view')
  async getLeads(
    @Query('stage') stage: string | undefined,
    @Query('deal_stage') deal_stage: string | undefined,
    @Query('tag') tag: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.crmService.findLeads(ctx, stage, deal_stage, tag);
  }

  @Get('leads/:id')
  @RequirePermissions('crm.lead.view')
  async getLead(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.findOneLead(id, ctx);
  }

  @Patch('leads/:id')
  @RequirePermissions('crm.lead.create')
  async updateLead(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.updateLead(id, body as Parameters<CrmService['updateLead']>[1], ctx);
  }

  @Post('customers')
  @RequirePermissions('crm.customer.create')
  async createCustomer(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.createCustomer(body as Parameters<CrmService['createCustomer']>[0], ctx);
  }

  @Get('customers')
  @RequirePermissions('crm.customer.view')
  async getCustomers(@Query('tag') tag: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.findCustomers(ctx, tag);
  }

  @Get('customers/:id')
  @RequirePermissions('crm.customer.view')
  async getCustomer(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.findOneCustomer(id, ctx);
  }

  @Get('customers/:id/360')
  @RequirePermissions('crm.customer.view')
  async getCustomer360(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.getCustomer360(id, ctx);
  }

  @Patch('customers/:id')
  @RequirePermissions('crm.customer.create')
  async updateCustomer(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.updateCustomer(id, body as Parameters<CrmService['updateCustomer']>[1], ctx);
  }

  @Post('follow-ups')
  @RequirePermissions('crm.lead.create')
  async createFollowUp(@Body() body: { lead_id?: string; customer_id?: string; due_at: string; note?: string }, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.createFollowUp(body, ctx);
  }

  @Get('follow-ups')
  @RequirePermissions('crm.lead.view')
  async getFollowUps(@Query('lead_id') leadId: string | undefined, @Query('customer_id') customerId: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.findFollowUps(ctx, { lead_id: leadId, customer_id: customerId });
  }

  @Get('follow-ups/due-today')
  @RequirePermissions('crm.lead.view')
  async getFollowUpsDueToday(@CurrentTenant() ctx: TenantContext) {
    return this.crmService.findFollowUpsDueToday(ctx);
  }

  @Get('follow-ups/:id')
  @RequirePermissions('crm.lead.view')
  async getFollowUp(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.findOneFollowUp(id, ctx);
  }

  @Patch('follow-ups/:id')
  @RequirePermissions('crm.lead.create')
  async updateFollowUp(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.crmService.updateFollowUp(id, body as Parameters<CrmService['updateFollowUp']>[1], ctx);
  }

  @Delete('follow-ups/:id')
  @RequirePermissions('crm.lead.create')
  async deleteFollowUp(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    await this.crmService.deleteFollowUp(id, ctx);
  }
}
