import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminOfflinePaymentDto {
  @IsUUID()
  tenant_id: string;

  @IsIn(['cash', 'cheque', 'upi'])
  method: 'cash' | 'cheque' | 'upi';

  @IsIn(['basic', 'advanced', 'enterprise'])
  plan: string;

  @IsIn(['monthly', 'quarterly', 'yearly'])
  interval: string;

  /** Amount collected in rupees (what you received in hand / bank). */
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount_rupees: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** When true, workspace is_active = true after recording. Default true. */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activate?: boolean;
}

export class AdminLicenceRemindDto {
  @IsUUID()
  tenant_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AdminLicenceActivateDto {
  @IsUUID()
  tenant_id: string;

  @IsOptional()
  @IsIn(['basic', 'advanced', 'enterprise', 'ai_pro'])
  plan?: string;

  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'yearly'])
  interval?: string;

  /** ISO date YYYY-MM-DD — if set, used as exact end instead of extending. */
  @IsOptional()
  @IsString()
  subscription_ends_at?: string | null;

  @IsOptional()
  is_active?: boolean;
}
