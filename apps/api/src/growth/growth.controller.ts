import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { GrowthService } from './growth.service';

@Controller('growth')
@UseGuards(JwtAuthGuard, TenantGuard)
export class GrowthController {
  constructor(private readonly growth: GrowthService) {}

  @Get('packs')
  @RequirePermissions('org.company.view')
  packs() {
    return this.growth.listPacks();
  }

  @Post('packs/:type/apply')
  @RequirePermissions('org.company.update')
  applyPack(
    @Param('type') type: string,
    @Body() body: { force?: boolean; list_existing_items?: boolean },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.growth.applyPack(ctx, type, body);
  }

  @Get('site')
  @RequirePermissions('org.company.view')
  site(@CurrentTenant() ctx: TenantContext) {
    return this.growth.getMySite(ctx);
  }

  @Patch('site')
  @RequirePermissions('org.company.update')
  saveSite(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.growth.saveMySite(ctx, body);
  }

  @Get('catalog')
  @RequirePermissions('inventory.item.view')
  catalog(@CurrentTenant() ctx: TenantContext) {
    return this.growth.getCatalog(ctx);
  }

  @Post('catalog/list-all')
  @RequirePermissions('inventory.item.create')
  listAll(@Body() body: { listed?: boolean }, @CurrentTenant() ctx: TenantContext) {
    return this.growth.bulkListCatalog(ctx, body.listed !== false);
  }

  @Patch('catalog/:itemId')
  @RequirePermissions('inventory.item.create')
  setListed(
    @Param('itemId') itemId: string,
    @Body() body: { portal_listed: boolean },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.growth.setCatalogListing(ctx, itemId, Boolean(body.portal_listed));
  }

  @Get('portal-orders')
  @RequirePermissions('sales.order.view')
  portalOrders(@Query('channel') channel: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.growth.portalOrders(ctx, channel);
  }

  @Get('channels')
  @RequirePermissions('org.company.view')
  channels(@CurrentTenant() ctx: TenantContext) {
    return this.growth.getChannels(ctx);
  }

  @Patch('channels')
  @RequirePermissions('org.company.update')
  saveChannels(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.growth.saveChannels(ctx, body);
  }

  @Get('payments/providers')
  @RequirePermissions('org.company.view')
  providers(@CurrentTenant() ctx: TenantContext) {
    return this.growth.listPaymentProviders(ctx);
  }

  @Patch('payments/providers/:provider')
  @RequirePermissions('org.company.update')
  saveProvider(
    @Param('provider') provider: string,
    @Body() body: { enabled?: boolean; is_default?: boolean; credentials?: Record<string, string> },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.growth.savePaymentProvider(ctx, provider, body);
  }

  @Get('leads/hub')
  @RequirePermissions('crm.lead.view')
  leadHub(@CurrentTenant() ctx: TenantContext) {
    return this.growth.leadHub(ctx);
  }

  @Post('leads/ingest')
  @RequirePermissions('crm.lead.create')
  ingestLead(
    @Body() body: { source?: string; name: string; phone?: string; email?: string; message?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.growth.ingestFromTenant(ctx, body);
  }
}
