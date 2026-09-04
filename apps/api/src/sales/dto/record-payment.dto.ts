import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
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
