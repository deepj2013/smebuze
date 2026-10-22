import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { To2Decimals } from '../../common/money';

export class SavePayuDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return value === true || value === 'true';
  })
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  salt?: string;

  @IsOptional()
  @IsString()
  env?: 'test' | 'prod';

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
