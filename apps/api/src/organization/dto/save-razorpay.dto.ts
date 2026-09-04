import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { To2Decimals } from '../../common/money';

export class SaveRazorpayDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return value === true || value === 'true';
  })
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  key_id?: string;

  @IsOptional()
  @IsString()
  key_secret?: string;

  @IsOptional()
  @IsString()
  webhook_secret?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return value === true || value === 'true';
  })
  @IsBoolean()
  accept_partial?: boolean;

  @IsOptional()
  @Type(() => Number)
  @To2Decimals()
  @IsNumber()
  @Min(1)
  @Max(10000000)
  min_partial_rupees?: number;
}
