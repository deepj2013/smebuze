import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CustomPlanEnquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
