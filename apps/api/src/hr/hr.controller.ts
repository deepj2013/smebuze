import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';

@Controller('hr')
@UseGuards(JwtAuthGuard, TenantGuard)
@RequirePermissions('org.company.update')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('suggestions')
  suggestions() {
    return this.hrService.expenseSuggestions();
  }

  @Get('employees')
  listEmployees(@Query('company_id') companyId: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.findEmployees(ctx, companyId);
  }

  @Get('employees/:id')
  getEmployee(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.getEmployee(ctx, id);
  }

  @Post('employees')
  createEmployee(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.createEmployee(ctx, body as Parameters<HrService['createEmployee']>[1]);
  }

  @Patch('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.updateEmployee(ctx, id, body as Parameters<HrService['updateEmployee']>[2]);
  }

  @Put('employees/:id/components')
  setComponents(
    @Param('id') id: string,
    @Body() body: { components: Array<{ name: string; code?: string; kind: 'allowance' | 'deduction'; amount: number; is_percent?: boolean }> },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.hrService.setComponents(ctx, id, body.components || []);
  }

  @Get('leave-types')
  leaveTypes(@CurrentTenant() ctx: TenantContext) {
    return this.hrService.ensureLeaveTypes(ctx);
  }

  @Get('leaves')
  leaves(@Query('status') status: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.listLeaveApplications(ctx, status);
  }

  @Post('leaves')
  applyLeave(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.applyLeave(ctx, body as Parameters<HrService['applyLeave']>[1]);
  }

  @Patch('leaves/:id')
  setLeaveStatus(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected' | 'pending' },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.hrService.setLeaveStatus(ctx, id, body.status);
  }

  @Get('attendance')
  attendance(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('employee_id') employeeId: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.hrService.listAttendance(ctx, Number(year), Number(month), employeeId);
  }

  @Get('attendance/template')
  attendanceTemplate(@Res() res: Response) {
    const csv = this.hrService.attendanceTemplateCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance-template.csv');
    res.send(csv);
  }

  @Post('attendance')
  upsertAttendance(
    @Body() body: { rows: Array<{ employee_id?: string; employee_code?: string; attendance_date: string; status: string }> },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.hrService.upsertAttendance(ctx, body.rows || []);
  }

  @Post('attendance/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAttendance(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { year: string; month: string; company_id?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    if (!file?.buffer) {
      return { error: 'File required' };
    }
    return this.hrService.uploadAttendanceFile(ctx, file, {
      year: Number(body.year),
      month: Number(body.month),
      company_id: body.company_id,
    });
  }

  @Get('payroll')
  listPayroll(@Query('company_id') companyId: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.listPayrollRuns(ctx, companyId);
  }

  @Post('payroll/generate')
  generatePayroll(@Body() body: { company_id: string; year: number; month: number; notes?: string }, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.generatePayroll(ctx, body);
  }

  @Get('payroll/:id')
  getPayroll(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.getPayrollRun(ctx, id);
  }

  @Post('payroll/:id/finalize')
  finalizePayroll(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.hrService.finalizePayroll(ctx, id);
  }
}
