import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../tenant/entities/company.entity';
import { Branch } from '../tenant/entities/branch.entity';
import { Department } from '../tenant/entities/department.entity';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { RolePermission } from '../auth/entities/role-permission.entity';
import { UserRole } from '../auth/entities/user-role.entity';
import { PendingInvite } from '../auth/entities/pending-invite.entity';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, Branch, Department, User, Role, Permission, RolePermission, UserRole, PendingInvite]),
    AuditModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
