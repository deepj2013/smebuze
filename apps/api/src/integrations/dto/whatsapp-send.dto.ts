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
}
