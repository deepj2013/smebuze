import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';

@Controller('crm')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get('campaigns/categories')
  @RequirePermissions('crm.lead.view')
  async getCategories(@CurrentTenant() ctx: TenantContext) {
    return this.campaignService.getCategories(ctx);
  }

  @Post('campaigns/categories')
  @RequirePermissions('crm.lead.create')
  async createCategory(@Body() body: { name: string; slug?: string; description?: string }, @CurrentTenant() ctx: TenantContext) {
    return this.campaignService.createCategory(body, ctx);
  }

  @Patch('campaigns/categories/:id')
  @RequirePermissions('crm.lead.create')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.campaignService.updateCategory(id, body, ctx);
  }

  @Get('campaigns/templates')
  @RequirePermissions('crm.lead.view')
  async getTemplates(@CurrentTenant() ctx: TenantContext) {
    return this.campaignService.getTemplates(ctx);
  }

  @Post('campaigns/templates')
  @RequirePermissions('crm.lead.create')
  async createTemplate(
    @Body() body: { name: string; subject?: string; body: string; channel?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.campaignService.createTemplate(body, ctx);
  }

  @Get('campaigns/templates/:id')
  @RequirePermissions('crm.lead.view')
  async getTemplate(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.campaignService.getTemplateById(id, ctx);
  }

  @Patch('campaigns/templates/:id')
  @RequirePermissions('crm.lead.create')
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: { name?: string; subject?: string; body?: string; channel?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.campaignService.updateTemplate(id, body, ctx);
  }

  @Get('campaigns/ai-message-samples')
  @RequirePermissions('crm.lead.view')
  async getAiMessageSamples(@Query('purpose') purpose: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.campaignService.getAiMessageSamples(ctx, purpose);
  }
}
