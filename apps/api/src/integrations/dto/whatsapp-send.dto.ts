import { IsObject, IsOptional, IsString } from 'class-validator';

export class WhatsappSendDto {
  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, string>;

  @IsOptional()
  @IsString()
  param?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  urlParam?: string;

  @IsOptional()
  @IsString()
  headUrl?: string;

  @IsOptional()
  @IsString()
  headParam?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  pdfName?: string;
}

export class WhatsappTemplatesDto {
  @IsOptional()
  @IsString()
  reminder?: string;

  @IsOptional()
  @IsString()
  invoice?: string;

  @IsOptional()
  @IsString()
  quotation?: string;

  @IsOptional()
  @IsString()
  order?: string;
}
