import { IsEmail, IsIn, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;

  @IsOptional()
  @IsIn(['verify_email', 'reset_password'])
  purpose?: string;
}

export class ResendOtpDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;

  @IsOptional()
  @IsIn(['verify_email', 'reset_password'])
  purpose?: string;
}

export class ResetPasswordOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  newPassword: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}
