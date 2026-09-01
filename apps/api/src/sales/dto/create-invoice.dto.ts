import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
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
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional() @IsBoolean() gst_applicable?: boolean;
  @IsOptional() @IsNumber() @Min(0) shipping_charges?: number;
  @IsOptional() @IsNumber() @Min(0) other_charges?: number;
  @IsOptional() @IsNumber() @Min(0) discount_amount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines: CreateInvoiceLineDto[];
}
