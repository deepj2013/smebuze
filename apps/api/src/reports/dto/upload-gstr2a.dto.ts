import { IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class UploadGstr2aDto {
  @Matches(/^\d{4}-\d{2}$/)
  period: string;

  @IsOptional()
  @IsString()
  company_id?: string;

  @IsOptional()
  @IsObject()
  json?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  csv?: string;
}
