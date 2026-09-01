import { IsOptional, IsString } from 'class-validator';

export class SaveBrandingDto {
  @IsOptional()
  @IsString()
  primary_color?: string;

  @IsOptional()
  @IsString()
  accent_color?: string;

  @IsOptional()
  @IsString()
  display_name?: string | null;

  @IsOptional()
  @IsString()
  logo_url?: string | null;
}
