import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../common/decorators/public';
import { SkipSubscription } from '../common/decorators/skip-subscription';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { BillingService } from './billing.service';
import { BillingPayDto, RazorpayConfirmDto } from './dto/billing-pay.dto';

@Controller('billing')
@SkipSubscription()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard, TenantGuard)
  status(@CurrentTenant() ctx: TenantContext) {
    return this.billing.status(ctx);
  }

  @Post('razorpay/order')
  @UseGuards(JwtAuthGuard, TenantGuard)
  razorpayOrder(@CurrentTenant() ctx: TenantContext, @Body() dto: BillingPayDto) {
    return this.billing.createRazorpayOrder(ctx, dto);
  }

  @Post('razorpay/confirm')
  @UseGuards(JwtAuthGuard, TenantGuard)
  razorpayConfirm(@CurrentTenant() ctx: TenantContext, @Body() dto: RazorpayConfirmDto) {
    return this.billing.confirmRazorpay(ctx, dto);
  }

  @Post('phonepe/start')
  @UseGuards(JwtAuthGuard, TenantGuard)
  phonepeStart(@CurrentTenant() ctx: TenantContext, @Body() dto: BillingPayDto) {
    return this.billing.startPhonePe(ctx, dto);
  }

  @Get('phonepe/status')
  @UseGuards(JwtAuthGuard, TenantGuard)
  phonepeStatus(@CurrentTenant() ctx: TenantContext, @Query('txn') txn: string) {
    return this.billing.phonePeStatus(ctx, txn);
  }

  @Public()
  @SkipThrottle()
  @Post('phonepe/webhook')
  phonepeWebhook(@Req() req: Request & { rawBody?: Buffer | string }, @Body() body: Record<string, unknown>) {
    const raw = typeof req.rawBody === 'string' ? req.rawBody : req.rawBody?.toString('utf8') || JSON.stringify(req.body ?? {});
    const xVerify = (req.headers['x-verify'] as string | undefined) || (req.headers['X-VERIFY'] as string | undefined);
    return this.billing.handlePhonePeWebhook(raw, xVerify, body || (req.body as Record<string, unknown>) || {});
  }

  @Public()
  @SkipThrottle()
  @Post('razorpay/webhook')
  razorpayWebhook(@Req() req: Request & { rawBody?: Buffer | string }) {
    const raw = typeof req.rawBody === 'string' ? req.rawBody : req.rawBody?.toString('utf8') || JSON.stringify(req.body ?? {});
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    return this.billing.handleRazorpayWebhook(raw, signature);
  }
}
