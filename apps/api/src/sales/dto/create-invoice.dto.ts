import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { To2Decimals, ToInteger } from '../../common/money';

export class CreateInvoiceLineDto {
  @IsOptional()
  @IsUUID()
  item_id?: string;

  @IsString()
  hsn_sac: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @ToInteger()
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

export class CreateInvoiceDto {
  @IsOptional() @IsUUID() sales_order_id?: string;
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
  @ValidateIf((_, v) => v != null && v !== '')
  @IsDateString()
  due_date?: string | null;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional() @IsBoolean() gst_applicable?: boolean;
  @IsOptional() @Type(() => Number) @To2Decimals() @IsNumber() @Min(0) shipping_charges?: number;
  @IsOptional() @Type(() => Number) @To2Decimals() @IsNumber() @Min(0) other_charges?: number;
  @IsOptional() @Type(() => Number) @To2Decimals() @IsNumber() @Min(0) discount_amount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines: CreateInvoiceLineDto[];
}
