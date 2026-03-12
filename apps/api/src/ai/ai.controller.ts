import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('summary')
  @RequirePermissions('reports.view')
  async getSummary(@CurrentTenant() ctx: TenantContext, @Query('period') period?: string) {
    return this.aiService.getBusinessSummary(ctx, period);
  }

  @Get('agents')
  @RequirePermissions('reports.view')
  async listAgents() {
    return this.aiService.listAgents();
  }

  @Post('agents/:id')
  @RequirePermissions('reports.view')
  async invokeAgent(
    @Param('id') id: string,
    @CurrentTenant() ctx: TenantContext,
    @Body() body?: { params?: Record<string, string> },
  ) {
    return this.aiService.invokeAgent(id, ctx, body?.params);
  }
}
