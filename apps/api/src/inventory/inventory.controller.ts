import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard, TenantGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('warehouses')
  @RequirePermissions('inventory.item.create')
  async createWarehouse(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.createWarehouse(body as Parameters<InventoryService['createWarehouse']>[0], ctx);
  }

  @Get('warehouses')
  @RequirePermissions('inventory.item.view')
  async getWarehouses(@CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.findWarehouses(ctx);
  }

  @Get('warehouses/:id')
  @RequirePermissions('inventory.item.view')
  async getWarehouse(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.findOneWarehouse(id, ctx);
  }

  @Patch('warehouses/:id')
  @RequirePermissions('inventory.item.create')
  async updateWarehouse(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.updateWarehouse(id, body as Parameters<InventoryService['updateWarehouse']>[1], ctx);
  }

  @Get('items/next-sku')
  @RequirePermissions('inventory.item.view')
  async getNextSku(@CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.generateNextSku(ctx);
  }

  @Post('items')
  @RequirePermissions('inventory.item.create')
  async createItem(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.createItem(body as Parameters<InventoryService['createItem']>[0], ctx);
  }

  @Get('items')
  @RequirePermissions('inventory.item.view')
  async getItems(@CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.findItems(ctx);
  }

  @Get('items/:id')
  @RequirePermissions('inventory.item.view')
  async getItem(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.findOneItem(id, ctx);
  }

  @Patch('items/:id')
  @RequirePermissions('inventory.item.create')
  async updateItem(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.updateItem(id, body as Parameters<InventoryService['updateItem']>[1], ctx);
  }

  @Get('stock')
  @RequirePermissions('inventory.stock.view')
  async getStock(
    @Query('warehouse_id') warehouseId: string | undefined,
    @Query('batch_code') batchCode: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.inventoryService.findStock(ctx, warehouseId, batchCode);
  }

  @Get('stock/low')
  @RequirePermissions('inventory.stock.view')
  async getLowStock(@CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.findLowStock(ctx);
  }

  @Post('stock/receive')
  @RequirePermissions('inventory.item.create')
  async receiveStock(
    @Body() body: { warehouse_id: string; item_id: string; quantity: number },
    @CurrentTenant() ctx: TenantContext,
  ) {
    await this.inventoryService.receiveStock(ctx, body.warehouse_id, body.item_id, body.quantity);
    return { ok: true };
  }

  @Post('stock-transfers')
  @RequirePermissions('inventory.item.create')
  async createStockTransfer(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.createStockTransfer(body as Parameters<InventoryService['createStockTransfer']>[0], ctx);
  }

  @Get('stock-transfers')
  @RequirePermissions('inventory.stock.view')
  async getStockTransfers(@Query('status') status: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.findStockTransfers(ctx, status);
  }

  @Get('stock-transfers/:id')
  @RequirePermissions('inventory.stock.view')
  async getStockTransfer(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.findOneStockTransfer(id, ctx);
  }
}
