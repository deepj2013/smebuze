import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class AdminPlanCatalogDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  invoice_lite_monthly_rupees?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  invoice_lite_yearly_rupees?: number;
}
