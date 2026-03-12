import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseGuards(TenantGuard)
  @RequirePermissions('admin.tenant.create')
  async create(
    @Body() body: { name: string; slug: string; plan?: string; features?: string[] },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.tenantService.create(body, ctx);
  }

  @Get()
  @UseGuards(TenantGuard)
  @RequirePermissions('admin.tenant.view')
  async findAll(@CurrentTenant() ctx: TenantContext) {
    return this.tenantService.findAll(ctx);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.tenantService.findOne(id, ctx);
  }

  @Patch(':id')
  @UseGuards(TenantGuard)
  @RequirePermissions('admin.tenant.create')
  async update(
    @Param('id') id: string,
    @Body() body: { license_key?: string | null; features?: string[]; subscription_ends_at?: string | null; plan?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.tenantService.update(id, body, ctx);
  }
}
