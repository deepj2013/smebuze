import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceLineDto {
  @IsOptional()
  @IsUUID()
  item_id?: string;

  @IsString()
  hsn_sac: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  qty: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsNumber()
  @Min(0)
  cgst_rate: number;

  @IsNumber()
  @Min(0)
  sgst_rate: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  igst_rate?: number;
}

export class CreateInvoiceDto {
  @IsUUID()
  company_id: string;

  @IsOptional()
  @IsUUID()
  branch_id?: string;

  /** Bill-to: provide either customer_id (customer as buyer) or vendor_id (vendor as buyer). */
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @IsDateString()
  invoice_date: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines: CreateInvoiceLineDto[];
}
