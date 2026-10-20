import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
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

  @Get('categories')
  @RequirePermissions('inventory.item.view')
  async getCategories(@CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.findCategories(ctx);
  }

  @Post('categories')
  @RequirePermissions('inventory.item.create')
  async createCategory(@Body() body: { name: string; sort_order?: number; parent_id?: string | null }, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.createCategory(body, ctx);
  }

  @Patch('categories/:id')
  @RequirePermissions('inventory.item.create')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; sort_order?: number; is_active?: boolean; parent_id?: string | null },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.inventoryService.updateCategory(id, body, ctx);
  }

  @Get('items/next-sku')
  @RequirePermissions('inventory.item.view')
  async getNextSku(@CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.generateNextSku(ctx);
  }

  @Get('items/next-barcode')
  @RequirePermissions('inventory.item.view')
  async getNextBarcode(@CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.generateNextBarcode(ctx);
  }

  @Post('items/upload-image')
  @RequirePermissions('inventory.item.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadItemImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentTenant() ctx: TenantContext,
  ): Promise<{ url: string }> {
    if (!file?.buffer) throw new BadRequestException('No file uploaded');
    if (!ctx.tenantId) throw new BadRequestException('Tenant required');
    const dir = path.join(process.cwd(), 'uploads', 'items');
    fs.mkdirSync(dir, { recursive: true });
    const ext = path.extname(file.originalname || '') || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : '.jpg';
    const filename = `${ctx.tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`;
    fs.writeFileSync(path.join(dir, filename), file.buffer);
    return { url: `/uploads/items/${filename}` };
  }

  @Post('items')
  @RequirePermissions('inventory.item.create')
  async createItem(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.createItem(body as Parameters<InventoryService['createItem']>[0], ctx);
  }

  @Post('items/deactivate-duplicates')
  @RequirePermissions('inventory.item.create')
  async deactivateDuplicates(@CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.deactivateDuplicateItems(ctx);
  }

  @Get('items')
  @RequirePermissions('inventory.item.view')
  async getItems(
    @Query('with_stock') withStock: string | undefined,
    @Query('barcode') barcode: string | undefined,
    @Query('purpose') purpose: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    const wantStock = withStock === '1' || withStock === 'true';
    const use = purpose === 'sale' || purpose === 'consume' ? purpose : undefined;
    if (barcode?.trim()) {
      return this.inventoryService.findItemsByCode(barcode.trim(), ctx, wantStock);
    }
    if (wantStock) {
      return this.inventoryService.findItemsWithStock(ctx, use);
    }
    return this.inventoryService.findItems(ctx, use);
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

  @Delete('items/:id')
  @RequirePermissions('inventory.item.create')
  async deactivateItem(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.deactivateItem(id, ctx);
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

  @Get('stock/expiring')
  @RequirePermissions('inventory.stock.view')
  async getExpiringStock(
    @Query('within_days') withinDays: string | undefined,
    @Query('warehouse_id') warehouseId: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    const days = withinDays != null && withinDays !== '' ? Number(withinDays) : 30;
    return this.inventoryService.findExpiringStock(ctx, Number.isFinite(days) ? days : 30, warehouseId);
  }

  @Post('stock/receive')
  @RequirePermissions('inventory.item.create')
  async receiveStock(
    @Body()
    body: {
      warehouse_id: string;
      item_id: string;
      quantity: number;
      cost_price?: number;
      measured?: boolean;
      batch_code?: string;
      expiry_date?: string;
    },
    @CurrentTenant() ctx: TenantContext,
  ) {
    if (body.cost_price != null && Number.isFinite(Number(body.cost_price))) {
      await this.inventoryService.setItemCost(ctx, body.item_id, Number(body.cost_price));
    }
    const opts = {
      batch_code: body.batch_code ?? null,
      expiry_date: body.expiry_date ?? null,
    };
    if (body.measured) {
      await this.inventoryService.receiveMeasured(ctx, body.warehouse_id, body.item_id, body.quantity, opts);
    } else {
      await this.inventoryService.receiveStock(ctx, body.warehouse_id, body.item_id, body.quantity, opts);
    }
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

  @Get('recipes')
  @RequirePermissions('inventory.item.view')
  listRecipes(@CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.listRecipes(ctx);
  }

  @Put('recipes/:finishedItemId')
  @RequirePermissions('inventory.item.create')
  saveRecipe(
    @Param('finishedItemId') finishedItemId: string,
    @Body() body: { lines: Array<{ component_item_id: string; qty_per_unit: number }> },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.inventoryService.saveRecipe(ctx, finishedItemId, body);
  }

  @Get('production')
  @RequirePermissions('inventory.stock.view')
  listProduction(@CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.listProduction(ctx);
  }

  @Post('production')
  @RequirePermissions('inventory.item.create')
  runProduction(
    @Body()
    body: { warehouse_id: string; finished_item_id: string; qty_produced: number; produced_at?: string; notes?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.inventoryService.runProduction(ctx, body);
  }

  @Get('promotions')
  @RequirePermissions('inventory.item.view')
  listPromotions(@Query('active') active: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.listPromotions(ctx, active === '1' || active === 'true');
  }

  @Post('promotions')
  @RequirePermissions('inventory.item.create')
  createPromotion(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.inventoryService.createPromotion(ctx, body as Parameters<InventoryService['createPromotion']>[1]);
  }

  @Patch('promotions/:id')
  @RequirePermissions('inventory.item.create')
  patchPromotion(
    @Param('id') id: string,
    @Body() body: { is_active?: boolean; name?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.inventoryService.patchPromotion(ctx, id, body);
  }
}
