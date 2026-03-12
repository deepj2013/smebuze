import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ServiceService } from './service.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';

@Controller('service')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get('tickets')
  async listTickets(@Query('company_id') companyId: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.serviceService.findTickets(ctx, companyId);
  }

  @Post('tickets')
  async createTicket(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.serviceService.createTicket(ctx, body as Parameters<ServiceService['createTicket']>[1]);
  }

  @Get('amc')
  async listAmc(@Query('company_id') companyId: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.serviceService.findAmcContracts(ctx, companyId);
  }

  @Post('amc')
  async createAmc(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.serviceService.createAmcContract(ctx, body as Parameters<ServiceService['createAmcContract']>[1]);
  }
}
