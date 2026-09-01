import { IsIn, IsOptional, IsString } from 'class-validator';

export class BillingPayDto {
  @IsOptional()
  @IsIn(['basic', 'advanced', 'enterprise'])
  plan?: string;

  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'yearly'])
  interval?: string;
}

export class RazorpayConfirmDto {
  @IsString()
  razorpay_order_id: string;

  @IsString()
  razorpay_payment_id: string;

  @IsString()
  razorpay_signature: string;
}
