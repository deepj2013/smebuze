import { IsIn, IsOptional, IsString } from 'class-validator';

export class SubmitManualPaymentDto {
  @IsString()
  plan: string;

  @IsIn(['monthly', 'quarterly', 'yearly'])
  interval: string;

  @IsOptional()
  @IsIn(['upi', 'bank', 'cash', 'cheque'])
  method?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AdminApprovePaymentProofDto {
  @IsString()
  payment_id: string;

  @IsOptional()
  activate?: boolean;
}

export class AdminRejectPaymentProofDto {
  @IsString()
  payment_id: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
