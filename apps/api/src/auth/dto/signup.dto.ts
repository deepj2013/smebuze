import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { SIGNUP_BUSINESS_TYPES, TENANT_CLIENT_TYPES } from '../../common/tenant-client-types';

export class SignupDto {
  @IsString()
  orgName: string;

  @IsString()
  @MinLength(2, { message: 'Slug must be at least 2 characters' })
  slug: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsIn(['basic', 'advanced', 'enterprise', 'ai_pro'])
  plan: string;

  @IsIn(['monthly', 'quarterly', 'yearly'])
  interval: string;

  /** Optional: payment reference (e.g. Razorpay order_id) for verification */
  @IsOptional()
  @IsString()
  paymentId?: string;

  /** Optional: start as trial (no payment); subscription_ends_at = now + 7 days */
  @IsOptional()
  @IsString()
  trial?: string; // 'true' to start trial

  /** How the shop will use SMEBUZE — shapes POS vs ERP workspace. */
  @IsOptional()
  @IsIn([...SIGNUP_BUSINESS_TYPES, TENANT_CLIENT_TYPES.STANDARD])
  businessType?: string;
}
