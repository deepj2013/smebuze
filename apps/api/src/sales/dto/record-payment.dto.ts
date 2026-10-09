import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { To2Decimals } from '../../common/money';

export class RecordPaymentDto {
  @Type(() => Number)
  @To2Decimals()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  payment_date: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class PaymentAllocationDto {
  @IsUUID()
  invoice_id: string;

  @Type(() => Number)
  @To2Decimals()
  @IsNumber()
  @Min(0.01)
  amount: number;
}

/** One customer payment split across several open invoices. */
export class ReceivePaymentDto {
  @IsDateString()
  payment_date: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations: PaymentAllocationDto[];
}
