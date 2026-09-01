import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class GoogleCompleteDto {
  @IsString()
  ticket: string;

  @IsOptional()
  @IsString()
  tenantSlug?: string;

  @IsOptional()
  @IsBoolean()
  platformAdmin?: boolean;
}
