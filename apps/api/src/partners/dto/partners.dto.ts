import { IsEmail, IsIn, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreatePartnerDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(3)
  code: string;

  @IsOptional()
  @IsString()
  contact_name?: string;

  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  commission_percent?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Optional partner portal login */
  @IsOptional()
  @IsEmail()
  login_email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  login_password?: string;
}

export class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  contact_name?: string;

  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  commission_percent?: number;

  @IsOptional()
  @IsIn(['active', 'paused'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBdeLeadDto {
  @IsString()
  @MinLength(2)
  company_name: string;

  @IsOptional()
  @IsString()
  contact_name?: string;

  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsIn(['new', 'contacted', 'demo', 'negotiation', 'won', 'lost'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_price_rupees?: number;

  @IsOptional()
  @IsIn(['basic', 'advanced', 'enterprise', 'ai_pro'])
  plan?: string;

  @IsOptional()
  @IsIn(['quarterly', 'yearly'])
  billing_interval?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['outbound', 'inbound', 'referral', 'event'])
  source?: string;
}

export class UpdateBdeLeadDto {
  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsString()
  contact_name?: string;

  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsIn(['new', 'contacted', 'demo', 'negotiation', 'won', 'lost'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_price_rupees?: number;

  @IsOptional()
  @IsIn(['basic', 'advanced', 'enterprise', 'ai_pro'])
  plan?: string;

  @IsOptional()
  @IsIn(['quarterly', 'yearly'])
  billing_interval?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['outbound', 'inbound', 'referral', 'event'])
  source?: string;

  @IsOptional()
  @IsString()
  converted_tenant_id?: string | null;
}

export class CreateBdeUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateCommissionStatusDto {
  @IsIn(['pending', 'approved', 'paid'])
  status: string;
}
