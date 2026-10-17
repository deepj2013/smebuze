import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { SkipSubscription } from '../common/decorators/skip-subscription';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { AdminBackupService } from './admin-backup.service';

@Controller('admin/database-backups')
@SkipSubscription()
@UseGuards(JwtAuthGuard, TenantGuard)
export class AdminBackupController {
  constructor(private readonly backups: AdminBackupService) {}

  private assertSuperAdmin(ctx: TenantContext) {
    if (!ctx.isSuperAdmin) {
      throw new ForbiddenException('Only the platform (universal) admin can manage database backups.');
    }
  }

  @Get()
  @RequirePermissions('admin.tenant.view')
  list(@CurrentTenant() ctx: TenantContext) {
    this.assertSuperAdmin(ctx);
    return this.backups.list();
  }

  @Post()
  @RequirePermissions('admin.tenant.create')
  create(@CurrentTenant() ctx: TenantContext) {
    this.assertSuperAdmin(ctx);
    return this.backups.create();
  }

  @Get(':name/download')
  @RequirePermissions('admin.tenant.view')
  download(
    @CurrentTenant() ctx: TenantContext,
    @Param('name') name: string,
    @Res() res: Response,
  ) {
    this.assertSuperAdmin(ctx);
    const file = this.backups.openDownload(name);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', String(file.size));
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    file.stream.pipe(res);
  }
}
