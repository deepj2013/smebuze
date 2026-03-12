import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';

@Controller('hr')
@UseGuards(JwtAuthGuard, TenantGuard)
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('employees')
  async listEmployees(@Query('company_id') companyId: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.findEmployees(ctx, companyId);
  }

  @Post('employees')
  async createEmployee(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.createEmployee(ctx, body as { company_id: string; name: string; employee_code?: string; email?: string; phone?: string; designation?: string; joining_date?: string });
  }
}
