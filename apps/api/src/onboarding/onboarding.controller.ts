import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('checklist')
  async getChecklist(@CurrentTenant() ctx: TenantContext) {
    return this.onboardingService.getChecklist(ctx);
  }

  @Post('complete')
  async completeOnboarding(@CurrentTenant() ctx: TenantContext) {
    return this.onboardingService.completeOnboarding(ctx);
  }

  @Post('events')
  async trackEvent(
    @Body() body: { event_name: string; payload?: Record<string, unknown> },
    @CurrentTenant() ctx: TenantContext,
  ) {
    await this.onboardingService.trackEvent(ctx, body.event_name, body.payload);
    return {};
  }

  @Post('survey')
  async submitSurvey(
    @Body() body: { rating?: number; feedback?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.onboardingService.submitSurvey(ctx, body.rating, body.feedback);
  }
}
