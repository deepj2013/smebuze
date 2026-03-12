import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { TenantContext } from '../common/tenant-context';

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  private assertTenant(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    return ctx.tenantId;
  }

  async findEmployees(ctx: TenantContext, companyId?: string): Promise<Employee[]> {
    const tenantId = this.assertTenant(ctx);
    const where: { tenant_id: string; company_id?: string } = { tenant_id: tenantId };
    if (companyId) where.company_id = companyId;
    return this.employeeRepo.find({ where, relations: ['company'], order: { name: 'ASC' } });
  }

  async createEmployee(
    ctx: TenantContext,
    dto: { company_id: string; employee_code?: string; name: string; email?: string; phone?: string; designation?: string; joining_date?: string },
  ): Promise<Employee> {
    const tenantId = this.assertTenant(ctx);
    const emp = this.employeeRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id,
      employee_code: dto.employee_code ?? null,
      name: dto.name,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      designation: dto.designation ?? null,
      joining_date: dto.joining_date ? new Date(dto.joining_date) : null,
    });
    return this.employeeRepo.save(emp);
  }
}
