import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEmail, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class PublicOrderLineDto {
  @IsString()
  item_id: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  qty: number;
}

export class PublicOrderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PublicOrderLineDto)
  lines: PublicOrderLineDto[];
}

export class PublicLeadIngestDto {
  @IsOptional()
  @IsString()
  tenant_slug?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
