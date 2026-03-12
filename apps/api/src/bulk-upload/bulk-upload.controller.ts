import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { BulkUploadService, BulkResult } from './bulk-upload.service';

@Controller('bulk-upload')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

  @Post('customers/preview')
  async previewCustomers(
    @Body() body: { rows: Record<string, unknown>[] },
    @CurrentTenant() ctx: TenantContext,
  ) {
    const rows = body.rows ?? [];
    return this.bulkUploadService.previewCustomers(rows, ctx);
  }

  @Post('customers')
  async uploadCustomers(
    @Body() body: { rows: Record<string, unknown>[] },
    @CurrentTenant() ctx: TenantContext,
  ): Promise<{ received: number; inserted: number; failed: number; errors: BulkResult['errors'] }> {
    const rows = body.rows ?? [];
    const result = await this.bulkUploadService.importCustomers(rows, ctx);
    return {
      received: rows.length,
      inserted: result.inserted,
      failed: result.failed,
      errors: result.errors,
    };
  }

  @Post('items/preview')
  async previewItems(
    @Body() body: { rows: Record<string, unknown>[] },
    @CurrentTenant() ctx: TenantContext,
  ) {
    const rows = body.rows ?? [];
    return this.bulkUploadService.previewItems(rows, ctx);
  }

  @Post('items')
  async uploadItems(
    @Body() body: { rows: Record<string, unknown>[] },
    @CurrentTenant() ctx: TenantContext,
  ): Promise<{ received: number; inserted: number; failed: number; errors: BulkResult['errors'] }> {
    const rows = body.rows ?? [];
    const result = await this.bulkUploadService.importItems(rows, ctx);
    return {
      received: rows.length,
      inserted: result.inserted,
      failed: result.failed,
      errors: result.errors,
    };
  }
}
