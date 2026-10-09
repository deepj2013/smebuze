import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeSalaryComponent } from './entities/employee-salary-component.entity';
import { Attendance } from './entities/attendance.entity';
import { LeaveType } from './entities/leave-type.entity';
import { LeaveApplication } from './entities/leave-application.entity';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollLine } from './entities/payroll-line.entity';
import { BusinessExpense } from '../ice-crest/entities/business-expense.entity';
import { HrService } from './hr.service';
import { HrController } from './hr.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      EmployeeSalaryComponent,
      Attendance,
      LeaveType,
      LeaveApplication,
      PayrollRun,
      PayrollLine,
      BusinessExpense,
    ]),
  ],
  controllers: [HrController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
