import { IsObject, IsOptional, IsString } from 'class-validator';

export class WhatsappSendDto {
  @IsString()
  to: string;

  @IsString()
  template: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, string>;
}
