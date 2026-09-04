import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { To2Decimals } from '../../common/money';

export class UpdateInvoiceLineDto {
  @IsOptional()
  @IsUUID()
  item_id?: string;

  @IsString()
  hsn_sac: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @To2Decimals()
  @IsNumber()
  @Min(0)
  qty: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @Type(() => Number)
  @To2Decimals()
  @IsNumber()
  @Min(0)
  rate: number;

  @Type(() => Number)
  @To2Decimals()
  @IsNumber()
  @Min(0)
  cgst_rate: number;

  @Type(() => Number)
  @To2Decimals()
  @IsNumber()
  @Min(0)
  sgst_rate: number;

  @IsOptional()
  @Type(() => Number)
  @To2Decimals()
  @IsNumber()
  @Min(0)
  igst_rate?: number;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsUUID()
  company_id?: string;

  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @IsOptional()
  @IsDateString()
  invoice_date?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsDateString()
  due_date?: string | null;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateInvoiceLineDto)
  lines?: UpdateInvoiceLineDto[];
}
