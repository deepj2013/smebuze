import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public';
import { SkipSubscription } from '../common/decorators/skip-subscription';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { BillingService } from './billing.service';
import { BillingPayDto } from './dto/billing-pay.dto';
import { CustomPlanEnquiryDto } from './dto/custom-plan-enquiry.dto';
import {
  AdminLicenceActivateDto,
  AdminLicenceRemindDto,
  AdminOfflinePaymentDto,
} from './dto/admin-licence.dto';
import {
  AdminApprovePaymentProofDto,
  AdminRejectPaymentProofDto,
  SubmitManualPaymentDto,
} from './dto/manual-payment.dto';
import { AdminPlanCatalogDto } from './dto/plan-catalog.dto';

@Controller('billing')
@SkipSubscription()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard, TenantGuard)
  status(@CurrentTenant() ctx: TenantContext) {
    return this.billing.status(ctx);
  }

  @Get('admin/licences')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions('admin.tenant.view')
  adminLicences(@CurrentTenant() ctx: TenantContext) {
    return this.billing.listLicences(ctx);
  }

  @Get('admin/plan-catalog')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions('admin.tenant.view')
  adminPlanCatalog(@CurrentTenant() ctx: TenantContext) {
    return this.billing.getAdminPlanCatalog(ctx);
  }

  @Post('admin/plan-catalog')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions('admin.tenant.create')
  adminPlanCatalogUpdate(@CurrentTenant() ctx: TenantContext, @Body() dto: AdminPlanCatalogDto) {
    return this.billing.updateAdminPlanCatalog(ctx, dto);
  }

  @Post('admin/offline-payment')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions('admin.tenant.create')
  adminOfflinePayment(@CurrentTenant() ctx: TenantContext, @Body() dto: AdminOfflinePaymentDto) {
    return this.billing.recordOfflinePayment(ctx, dto);
  }

  @Get('admin/pending-proofs')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions('admin.tenant.view')
  adminPendingProofs(@CurrentTenant() ctx: TenantContext) {
    return this.billing.listPendingPaymentProofs(ctx);
  }

  @Post('admin/approve-proof')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions('admin.tenant.create')
  adminApproveProof(@CurrentTenant() ctx: TenantContext, @Body() dto: AdminApprovePaymentProofDto) {
    return this.billing.approvePaymentProof(ctx, dto.payment_id, dto.activate !== false);
  }

  @Post('admin/reject-proof')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions('admin.tenant.create')
  adminRejectProof(@CurrentTenant() ctx: TenantContext, @Body() dto: AdminRejectPaymentProofDto) {
    return this.billing.rejectPaymentProof(ctx, dto.payment_id, dto.reason);
  }

  @Post('manual-payment/submit')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: 5 * 1024 * 1024 } }))
  submitManualProof(
    @CurrentTenant() ctx: TenantContext,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: SubmitManualPaymentDto,
  ) {
    if (!file?.buffer) throw new BadRequestException('Upload payment screenshot as proof');
    return this.billing.submitManualPaymentProof(ctx, body, file);
  }

  @Post('admin/remind')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions('admin.tenant.create')
  adminRemind(@CurrentTenant() ctx: TenantContext, @Body() dto: AdminLicenceRemindDto) {
    return this.billing.sendLicenceReminder(ctx, dto);
  }

  @Post('admin/activate')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions('admin.tenant.create')
  adminActivate(@CurrentTenant() ctx: TenantContext, @Body() dto: AdminLicenceActivateDto) {
    return this.billing.activateLicence(ctx, dto);
  }

  @Post('payu/checkout')
  @UseGuards(JwtAuthGuard, TenantGuard)
  payuCheckout(@CurrentTenant() ctx: TenantContext, @Body() dto: BillingPayDto) {
    return this.billing.createPayuCheckout(ctx, dto);
  }

  @Post('auto-renew')
  @UseGuards(JwtAuthGuard, TenantGuard)
  setAutoRenew(@CurrentTenant() ctx: TenantContext, @Body() body: { auto_renew?: boolean }) {
    return this.billing.setAutoRenew(ctx, body.auto_renew !== false);
  }

  @Post('ecs/setup')
  @UseGuards(JwtAuthGuard, TenantGuard)
  ecsSetup(@CurrentTenant() ctx: TenantContext, @Body() dto: BillingPayDto) {
    return this.billing.setupEcs(ctx, dto);
  }

  @Post('ecs/cancel')
  @UseGuards(JwtAuthGuard, TenantGuard)
  ecsCancel(@CurrentTenant() ctx: TenantContext) {
    return this.billing.cancelEcs(ctx);
  }


  @Public()
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  @Post('custom-enquiry')
  customEnquiry(@Body() body: CustomPlanEnquiryDto) {
    return this.billing.captureCustomEnquiry(body);
  }

}
