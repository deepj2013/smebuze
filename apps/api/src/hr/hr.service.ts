import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, DataSource } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeSalaryComponent } from './entities/employee-salary-component.entity';
import { Attendance } from './entities/attendance.entity';
import { LeaveType } from './entities/leave-type.entity';
import { LeaveApplication } from './entities/leave-application.entity';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollLine } from './entities/payroll-line.entity';
import { BusinessExpense } from '../ice-crest/entities/business-expense.entity';
import { TenantContext } from '../common/tenant-context';
import {
  DEFAULT_LEAVE_TYPES,
  DEFAULT_SALARY_ALLOWANCES,
  DEFAULT_SALARY_DEDUCTIONS,
  EXPENSE_CATEGORY_SUGGESTIONS,
} from './hr-defaults';

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function money(n: number) {
  return round2(n).toFixed(2);
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
}

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmployeeSalaryComponent) private readonly componentRepo: Repository<EmployeeSalaryComponent>,
    @InjectRepository(Attendance) private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(LeaveType) private readonly leaveTypeRepo: Repository<LeaveType>,
    @InjectRepository(LeaveApplication) private readonly leaveAppRepo: Repository<LeaveApplication>,
    @InjectRepository(PayrollRun) private readonly payrollRunRepo: Repository<PayrollRun>,
    @InjectRepository(PayrollLine) private readonly payrollLineRepo: Repository<PayrollLine>,
    @InjectRepository(BusinessExpense) private readonly expenseRepo: Repository<BusinessExpense>,
    private readonly dataSource: DataSource,
  ) {}

  private assertTenant(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    return ctx.tenantId;
  }

  /** Owner / tenant admin only — staff must not manage payroll. */
  private assertOwner(ctx: TenantContext) {
    const perms = ctx.permissions ?? [];
    if (ctx.isSuperAdmin) return;
    if (perms.includes('*') || perms.includes('org.company.update')) return;
    throw new ForbiddenException('Only the business owner / admin can manage Staff & Payroll');
  }

  expenseSuggestions() {
    return {
      categories: Object.keys(EXPENSE_CATEGORY_SUGGESTIONS),
      by_category: EXPENSE_CATEGORY_SUGGESTIONS,
      salary_allowances: DEFAULT_SALARY_ALLOWANCES,
      salary_deductions: DEFAULT_SALARY_DEDUCTIONS,
    };
  }

  // ─── Employees ─────────────────────────────────────────────

  async findEmployees(ctx: TenantContext, companyId?: string) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const where: { tenant_id: string; company_id?: string } = { tenant_id: tenantId };
    if (companyId) where.company_id = companyId;
    const list = await this.employeeRepo.find({ where, relations: ['company'], order: { name: 'ASC' } });
    const withComponents = await Promise.all(
      list.map(async (e) => ({
        ...e,
        components: await this.componentRepo.find({
          where: { tenant_id: tenantId, employee_id: e.id, is_active: true },
          order: { sort_order: 'ASC', name: 'ASC' },
        }),
      })),
    );
    return withComponents;
  }

  async getEmployee(ctx: TenantContext, id: string) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const emp = await this.employeeRepo.findOne({ where: { id, tenant_id: tenantId }, relations: ['company'] });
    if (!emp) throw new NotFoundException('Employee not found');
    const components = await this.componentRepo.find({
      where: { tenant_id: tenantId, employee_id: id },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
    return { ...emp, components };
  }

  async createEmployee(
    ctx: TenantContext,
    dto: {
      company_id: string;
      employee_code?: string;
      name: string;
      email?: string;
      phone?: string;
      designation?: string;
      joining_date?: string;
      basic_salary?: number;
      working_days_per_month?: number;
      bank_account?: string;
      bank_ifsc?: string;
      pan?: string;
      uan?: string;
      esi_number?: string;
      seed_default_components?: boolean;
      components?: Array<{ name: string; code?: string; kind: 'allowance' | 'deduction'; amount: number; is_percent?: boolean }>;
    },
  ) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    if (!dto.name?.trim()) throw new BadRequestException('Name is required');
    if (!dto.company_id) throw new BadRequestException('company_id is required');
    const emp = await this.employeeRepo.save(
      this.employeeRepo.create({
        tenant_id: tenantId,
        company_id: dto.company_id,
        employee_code: dto.employee_code ?? null,
        name: dto.name.trim(),
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        designation: dto.designation ?? null,
        joining_date: dto.joining_date ? new Date(dto.joining_date) : null,
        basic_salary: money(Number(dto.basic_salary ?? 0)),
        working_days_per_month: dto.working_days_per_month ?? 26,
        bank_account: dto.bank_account ?? null,
        bank_ifsc: dto.bank_ifsc ?? null,
        pan: dto.pan ?? null,
        uan: dto.uan ?? null,
        esi_number: dto.esi_number ?? null,
      }),
    );
    const seed =
      dto.components?.length
        ? dto.components
        : dto.seed_default_components !== false
          ? [...DEFAULT_SALARY_ALLOWANCES, ...DEFAULT_SALARY_DEDUCTIONS]
          : [];
    for (let i = 0; i < seed.length; i++) {
      const c = seed[i];
      await this.componentRepo.save(
        this.componentRepo.create({
          tenant_id: tenantId,
          employee_id: emp.id,
          name: c.name,
          code: c.code ?? null,
          kind: c.kind,
          amount: money(Number(c.amount ?? 0)),
          is_percent: Boolean(c.is_percent),
          sort_order: i,
        }),
      );
    }
    return this.getEmployee(ctx, emp.id);
  }

  async updateEmployee(
    ctx: TenantContext,
    id: string,
    dto: Partial<{
      name: string;
      email: string;
      phone: string;
      designation: string;
      joining_date: string;
      basic_salary: number;
      working_days_per_month: number;
      bank_account: string;
      bank_ifsc: string;
      pan: string;
      uan: string;
      esi_number: string;
      is_active: boolean;
      employee_code: string;
    }>,
  ) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const emp = await this.employeeRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!emp) throw new NotFoundException('Employee not found');
    if (dto.name !== undefined) emp.name = dto.name.trim();
    if (dto.email !== undefined) emp.email = dto.email || null;
    if (dto.phone !== undefined) emp.phone = dto.phone || null;
    if (dto.designation !== undefined) emp.designation = dto.designation || null;
    if (dto.joining_date !== undefined) emp.joining_date = dto.joining_date ? new Date(dto.joining_date) : null;
    if (dto.basic_salary !== undefined) emp.basic_salary = money(Number(dto.basic_salary));
    if (dto.working_days_per_month !== undefined) emp.working_days_per_month = dto.working_days_per_month;
    if (dto.bank_account !== undefined) emp.bank_account = dto.bank_account || null;
    if (dto.bank_ifsc !== undefined) emp.bank_ifsc = dto.bank_ifsc || null;
    if (dto.pan !== undefined) emp.pan = dto.pan || null;
    if (dto.uan !== undefined) emp.uan = dto.uan || null;
    if (dto.esi_number !== undefined) emp.esi_number = dto.esi_number || null;
    if (dto.is_active !== undefined) emp.is_active = dto.is_active;
    if (dto.employee_code !== undefined) emp.employee_code = dto.employee_code || null;
    await this.employeeRepo.save(emp);
    return this.getEmployee(ctx, id);
  }

  async setComponents(
    ctx: TenantContext,
    employeeId: string,
    components: Array<{ name: string; code?: string; kind: 'allowance' | 'deduction'; amount: number; is_percent?: boolean; is_active?: boolean }>,
  ) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const emp = await this.employeeRepo.findOne({ where: { id: employeeId, tenant_id: tenantId } });
    if (!emp) throw new NotFoundException('Employee not found');
    await this.componentRepo.delete({ tenant_id: tenantId, employee_id: employeeId });
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      if (!c.name?.trim() || !['allowance', 'deduction'].includes(c.kind)) continue;
      await this.componentRepo.save(
        this.componentRepo.create({
          tenant_id: tenantId,
          employee_id: employeeId,
          name: c.name.trim(),
          code: c.code ?? null,
          kind: c.kind,
          amount: money(Number(c.amount ?? 0)),
          is_percent: Boolean(c.is_percent),
          is_active: c.is_active !== false,
          sort_order: i,
        }),
      );
    }
    return this.getEmployee(ctx, employeeId);
  }

  // ─── Leave ─────────────────────────────────────────────────

  async ensureLeaveTypes(ctx: TenantContext) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const count = await this.leaveTypeRepo.count({ where: { tenant_id: tenantId } });
    if (count === 0) {
      for (const t of DEFAULT_LEAVE_TYPES) {
        await this.leaveTypeRepo.save(
          this.leaveTypeRepo.create({
            tenant_id: tenantId,
            name: t.name,
            code: t.code,
            days_per_year: String(t.days_per_year),
          }),
        );
      }
    }
    return this.leaveTypeRepo.find({ where: { tenant_id: tenantId }, order: { name: 'ASC' } });
  }

  async listLeaveApplications(ctx: TenantContext, status?: string) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    await this.ensureLeaveTypes(ctx);
    const where: { tenant_id: string; status?: string } = { tenant_id: tenantId };
    if (status) where.status = status;
    return this.leaveAppRepo.find({
      where,
      relations: ['employee', 'leave_type'],
      order: { created_at: 'DESC' },
    });
  }

  async applyLeave(
    ctx: TenantContext,
    dto: { employee_id: string; leave_type_id: string; from_date: string; to_date: string; days?: number; reason?: string },
  ) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const emp = await this.employeeRepo.findOne({ where: { id: dto.employee_id, tenant_id: tenantId } });
    if (!emp) throw new NotFoundException('Employee not found');
    const lt = await this.leaveTypeRepo.findOne({ where: { id: dto.leave_type_id, tenant_id: tenantId } });
    if (!lt) throw new NotFoundException('Leave type not found');
    const from = new Date(dto.from_date);
    const to = new Date(dto.to_date);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
      throw new BadRequestException('Invalid leave dates');
    }
    const days =
      dto.days ??
      Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return this.leaveAppRepo.save(
      this.leaveAppRepo.create({
        tenant_id: tenantId,
        employee_id: dto.employee_id,
        leave_type_id: dto.leave_type_id,
        from_date: from,
        to_date: to,
        days: String(days),
        reason: dto.reason ?? null,
        status: 'approved',
        approved_by: ctx.userId ?? null,
      }),
    );
  }

  async setLeaveStatus(ctx: TenantContext, id: string, status: 'approved' | 'rejected' | 'pending') {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const row = await this.leaveAppRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!row) throw new NotFoundException('Leave application not found');
    row.status = status;
    if (status === 'approved') row.approved_by = ctx.userId ?? null;
    return this.leaveAppRepo.save(row);
  }

  // ─── Attendance ────────────────────────────────────────────

  async listAttendance(ctx: TenantContext, year: number, month: number, employeeId?: string) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`;
    const qb = this.attendanceRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.employee', 'e')
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere('a.attendance_date BETWEEN :from AND :to', { from, to });
    if (employeeId) qb.andWhere('a.employee_id = :employeeId', { employeeId });
    return qb.orderBy('a.attendance_date', 'ASC').addOrderBy('e.name', 'ASC').getMany();
  }

  async upsertAttendance(
    ctx: TenantContext,
    rows: Array<{ employee_id?: string; employee_code?: string; attendance_date: string; status: string; notes?: string }>,
  ) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const employees = await this.employeeRepo.find({ where: { tenant_id: tenantId } });
    const byId = new Map(employees.map((e) => [e.id, e]));
    const byCode = new Map(employees.filter((e) => e.employee_code).map((e) => [e.employee_code!.toLowerCase(), e]));
    const byName = new Map(employees.map((e) => [e.name.trim().toLowerCase(), e]));
    let saved = 0;
    const errors: string[] = [];
    for (const row of rows) {
      let emp =
        (row.employee_id && byId.get(row.employee_id)) ||
        (row.employee_code && byCode.get(row.employee_code.trim().toLowerCase())) ||
        null;
      if (!emp && (row as { employee_name?: string }).employee_name) {
        emp = byName.get(String((row as { employee_name?: string }).employee_name).trim().toLowerCase()) ?? null;
      }
      if (!emp) {
        errors.push(`No employee for ${row.employee_code || row.employee_id || 'row'}`);
        continue;
      }
      const date = new Date(row.attendance_date);
      if (Number.isNaN(date.getTime())) {
        errors.push(`Bad date ${row.attendance_date}`);
        continue;
      }
      const status = this.normalizeStatus(row.status);
      const existing = await this.attendanceRepo.findOne({
        where: { tenant_id: tenantId, employee_id: emp.id, attendance_date: date as unknown as Date },
      });
      if (existing) {
        existing.status = status;
        existing.notes = row.notes ?? existing.notes;
        await this.attendanceRepo.save(existing);
      } else {
        await this.attendanceRepo.save(
          this.attendanceRepo.create({
            tenant_id: tenantId,
            employee_id: emp.id,
            attendance_date: date,
            status,
            notes: row.notes ?? null,
          }),
        );
      }
      saved += 1;
    }
    return { saved, errors };
  }

  private normalizeStatus(raw: string): string {
    const s = (raw || 'present').trim().toLowerCase();
    if (['p', 'present', 'full'].includes(s)) return 'present';
    if (['a', 'absent', 'abs'].includes(s)) return 'absent';
    if (['h', 'half', 'half_day', 'half-day'].includes(s)) return 'half_day';
    if (['l', 'leave', 'on leave'].includes(s)) return 'leave';
    return 'present';
  }

  /**
   * Parse CSV or Excel-like TSV pasted text.
   * Columns: employee_code | name, date (YYYY-MM-DD), status (P/A/H/L)
   */
  parseAttendanceText(text: string): Array<{ employee_code?: string; employee_name?: string; attendance_date: string; status: string }> {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) throw new BadRequestException('File needs a header row and at least one data row');
    const header = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    const codeIdx = header.findIndex((h) => /code|emp.?id|employee.?code/.test(h));
    const nameIdx = header.findIndex((h) => /name|employee.?name/.test(h));
    const dateIdx = header.findIndex((h) => /date|attendance.?date|day/.test(h));
    const statusIdx = header.findIndex((h) => /status|attendance|mark|present/.test(h));
    if (dateIdx < 0 || statusIdx < 0 || (codeIdx < 0 && nameIdx < 0)) {
      throw new BadRequestException('Header must include employee_code (or name), date, and status');
    }
    const out: Array<{ employee_code?: string; employee_name?: string; attendance_date: string; status: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
      const dateRaw = cols[dateIdx];
      const date = this.normalizeDate(dateRaw);
      if (!date) continue;
      out.push({
        employee_code: codeIdx >= 0 ? cols[codeIdx] : undefined,
        employee_name: nameIdx >= 0 ? cols[nameIdx] : undefined,
        attendance_date: date,
        status: cols[statusIdx] || 'present',
      });
    }
    return out;
  }

  private normalizeDate(raw: string): string | null {
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const d = m[1].padStart(2, '0');
      const mo = m[2].padStart(2, '0');
      let y = m[3];
      if (y.length === 2) y = `20${y}`;
      return `${y}-${mo}-${d}`;
    }
    const t = Date.parse(raw);
    if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
    return null;
  }

  async uploadAttendanceFile(
    ctx: TenantContext,
    file: { originalname?: string; buffer: Buffer; mimetype?: string },
    meta: { year: number; month: number; company_id?: string },
  ) {
    this.assertOwner(ctx);
    const name = (file.originalname || '').toLowerCase();
    const mime = file.mimetype || '';
    if (name.endsWith('.pdf') || mime.includes('pdf')) {
      throw new BadRequestException(
        'PDF attendance is not auto-read yet. Export the register to Excel/CSV (columns: employee_code, date, status) and upload that. You can keep the PDF as your paper backup.',
      );
    }
    let text = file.buffer.toString('utf8');
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || mime.includes('spreadsheet') || mime.includes('excel')) {
      text = await this.excelToCsv(file.buffer);
    }
    const rows = this.parseAttendanceText(text);
    const result = await this.upsertAttendance(ctx, rows);
    return {
      ...result,
      year: meta.year,
      month: meta.month,
      file_name: file.originalname,
      parsed_rows: rows.length,
    };
  }

  private async excelToCsv(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const XLSX = require('xlsx') as {
        read: (data: Buffer, opts: { type: string }) => { SheetNames: string[]; Sheets: Record<string, unknown> };
        utils: { sheet_to_csv: (sheet: unknown) => string };
      };
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_csv(sheet);
    } catch {
      throw new BadRequestException('Could not read Excel file. Save as CSV (employee_code, date, status) and try again.');
    }
  }

  attendanceTemplateCsv() {
    return 'employee_code,name,date,status\nE001,Ramesh,2026-03-01,P\nE001,Ramesh,2026-03-02,A\nE002,Sita,2026-03-01,P\n';
  }

  // ─── Payroll ───────────────────────────────────────────────

  async listPayrollRuns(ctx: TenantContext, companyId?: string) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const where: { tenant_id: string; company_id?: string } = { tenant_id: tenantId };
    if (companyId) where.company_id = companyId;
    return this.payrollRunRepo.find({ where, order: { year: 'DESC', month: 'DESC' }, relations: ['company'] });
  }

  async getPayrollRun(ctx: TenantContext, id: string) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const run = await this.payrollRunRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['company', 'lines', 'lines.employee'],
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  async generatePayroll(ctx: TenantContext, dto: { company_id: string; year: number; month: number; notes?: string }) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const { company_id, year, month } = dto;
    if (!company_id || !year || !month || month < 1 || month > 12) {
      throw new BadRequestException('company_id, year and month are required');
    }
    const existing = await this.payrollRunRepo.findOne({ where: { tenant_id: tenantId, company_id, year, month } });
    if (existing?.status === 'finalized') {
      throw new ForbiddenException('Payroll for this month is already finalized');
    }
    const employees = await this.employeeRepo.find({
      where: { tenant_id: tenantId, company_id, is_active: true },
      order: { name: 'ASC' },
    });
    if (!employees.length) throw new BadRequestException('No active employees for this company');

    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0);
    const attendance = await this.attendanceRepo.find({
      where: { tenant_id: tenantId, attendance_date: Between(from, to) },
    });
    const leaves = await this.leaveAppRepo.find({
      where: { tenant_id: tenantId, status: 'approved' },
    });

    return this.dataSource.transaction(async (manager) => {
      let run = existing;
      if (run) {
        await manager.getRepository(PayrollLine).delete({ payroll_run_id: run.id, tenant_id: tenantId });
      } else {
        run = await manager.getRepository(PayrollRun).save(
          manager.getRepository(PayrollRun).create({
            tenant_id: tenantId,
            company_id,
            year,
            month,
            status: 'draft',
            notes: dto.notes ?? null,
            created_by: ctx.userId ?? null,
          }),
        );
      }

      let totalGross = 0;
      let totalDed = 0;
      let totalNet = 0;
      const lineRepo = manager.getRepository(PayrollLine);
      let slipSeq = 1;

      for (const emp of employees) {
        const working = emp.working_days_per_month || 26;
        const empAtt = attendance.filter((a) => a.employee_id === emp.id);
        let present = 0;
        let half = 0;
        let leaveDays = 0;
        for (const a of empAtt) {
          if (a.status === 'present') present += 1;
          else if (a.status === 'half_day') half += 0.5;
          else if (a.status === 'leave') leaveDays += 1;
        }
        if (empAtt.length === 0) {
          for (const lv of leaves.filter((l) => l.employee_id === emp.id)) {
            const lf = new Date(lv.from_date);
            const ltDate = new Date(lv.to_date);
            let d = new Date(Math.max(lf.getTime(), from.getTime()));
            const end = new Date(Math.min(ltDate.getTime(), to.getTime()));
            while (d <= end) {
              leaveDays += 1;
              d.setDate(d.getDate() + 1);
            }
          }
        }
        leaveDays = Math.min(leaveDays, working);
        const presentDays = present + half;
        const paidDays = empAtt.length === 0 && leaveDays === 0 ? working : Math.min(working, presentDays + leaveDays);
        const unpaidAbsent = Math.max(0, working - paidDays);

        const basicFull = Number(emp.basic_salary || 0);
        const basic = round2((basicFull * paidDays) / working);
        const components = await manager.getRepository(EmployeeSalaryComponent).find({
          where: { tenant_id: tenantId, employee_id: emp.id, is_active: true },
          order: { sort_order: 'ASC' },
        });
        const allowances: Array<{ name: string; amount: number }> = [];
        const deductions: Array<{ name: string; amount: number }> = [];
        for (const c of components) {
          const raw = Number(c.amount);
          const amt = round2(c.is_percent ? (basic * raw) / 100 : (raw * paidDays) / working);
          if (c.kind === 'allowance') allowances.push({ name: c.name, amount: amt });
          else deductions.push({ name: c.name, amount: amt });
        }
        if (empAtt.length > 0 && unpaidAbsent > 0 && basicFull > 0) {
          const lwp = round2((basicFull * unpaidAbsent) / working);
          deductions.push({ name: 'Loss of pay', amount: lwp });
        }
        const allowSum = round2(allowances.reduce((s, a) => s + a.amount, 0));
        const dedSum = round2(deductions.reduce((s, a) => s + a.amount, 0));
        const gross = round2(basic + allowSum);
        const net = round2(Math.max(0, gross - dedSum));
        totalGross += gross;
        totalDed += dedSum;
        totalNet += net;

        await lineRepo.save(
          lineRepo.create({
            tenant_id: tenantId,
            payroll_run_id: run!.id,
            employee_id: emp.id,
            slip_number: `SLIP-${year}${String(month).padStart(2, '0')}-${String(slipSeq++).padStart(3, '0')}`,
            present_days: String(presentDays),
            paid_days: String(paidDays),
            leave_days: String(leaveDays),
            absent_days: String(unpaidAbsent),
            working_days: String(working),
            basic: money(basic),
            allowances_json: allowances,
            deductions_json: deductions,
            gross: money(gross),
            deductions_total: money(dedSum),
            net: money(net),
          }),
        );
      }

      run!.total_gross = money(totalGross);
      run!.total_deductions = money(totalDed);
      run!.total_net = money(totalNet);
      run!.status = 'draft';
      run!.notes = dto.notes ?? run!.notes;
      await manager.getRepository(PayrollRun).save(run!);
      return run!.id;
    }).then((runId) => this.getPayrollRun(ctx, runId));
  }

  async finalizePayroll(ctx: TenantContext, id: string) {
    this.assertOwner(ctx);
    const tenantId = this.assertTenant(ctx);
    const run = await this.payrollRunRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['lines', 'lines.employee'],
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status === 'finalized') return run;

    const label = monthLabel(run.year, run.month);
    const expenseDate = `${run.year}-${String(run.month).padStart(2, '0')}-${String(daysInMonth(run.year, run.month)).padStart(2, '0')}`;

    await this.dataSource.transaction(async (manager) => {
      for (const line of run.lines) {
        if (line.expense_id) continue;
        const net = Number(line.net);
        if (net <= 0) continue;
        const empName = line.employee?.name || 'Staff';
        const expense = await manager.getRepository(BusinessExpense).save(
          manager.getRepository(BusinessExpense).create({
            tenant_id: tenantId,
            company_id: run.company_id,
            entry_type: 'salary',
            expense_number: `PAY-${line.slip_number || line.id.slice(0, 8)}`,
            employee_name: empName,
            category: 'Salary',
            subcategory: `Monthly payroll — ${label}`,
            payroll_line_id: line.id,
            nature: 'admin',
            taxable_amount: money(net),
            gst_rate: '0.00',
            gst_amount: '0.00',
            tds_amount: '0.00',
            amount: money(net),
            paid_amount: '0.00',
            status: 'unpaid',
            expense_date: new Date(expenseDate),
            description: `Salary slip ${line.slip_number} — ${empName} (${label}). Gross ${line.gross}, deductions ${line.deductions_total}, net ${line.net}.`,
            payment_mode: null,
            reference: run.id,
            created_by: ctx.userId ?? null,
          }),
        );
        line.expense_id = expense.id;
        await manager.getRepository(PayrollLine).save(line);
      }
      run.status = 'finalized';
      run.finalized_at = new Date();
      await manager.getRepository(PayrollRun).save(run);
    });

    return this.getPayrollRun(ctx, id);
  }
}
