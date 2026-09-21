import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { FloorService, KitchenStatus } from './floor.service';

@Controller('sales/floor')
@UseGuards(JwtAuthGuard, TenantGuard)
export class FloorController {
  constructor(private readonly floor: FloorService) {}

  @Get()
  @RequirePermissions('sales.order.view')
  snapshot(@CurrentTenant() ctx: TenantContext) {
    return this.floor.snapshot(ctx);
  }

  @Patch('tables')
  @RequirePermissions('sales.order.create')
  saveTables(@Body() body: { tables: string[] }, @CurrentTenant() ctx: TenantContext) {
    return this.floor.saveTables(ctx, body?.tables ?? []);
  }

  @Get('kitchen')
  @RequirePermissions('sales.order.view')
  kitchen(@CurrentTenant() ctx: TenantContext) {
    return this.floor.listKitchen(ctx);
  }

  @Post('tickets')
  @RequirePermissions('sales.order.create')
  send(
    @Body()
    body: {
      company_id?: string;
      table_no: string;
      covers?: number;
      waiter_name?: string;
      note?: string;
      lines: Array<{ item_id: string; qty: number; note?: string }>;
    },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.floor.sendTicket(ctx, body);
  }

  @Patch('tickets/:id/kitchen')
  @RequirePermissions('sales.order.create')
  kitchenStatus(
    @Param('id') id: string,
    @Body() body: { kitchen_status: KitchenStatus },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.floor.setKitchenStatus(ctx, id, body.kitchen_status);
  }

  @Post('tickets/:id/bill')
  @RequirePermissions('sales.invoice.create')
  bill(
    @Param('id') id: string,
    @Body() body: { mode?: 'cash' | 'upi' | 'card' },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.floor.billTicket(ctx, id, body || {});
  }
}
