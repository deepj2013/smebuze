import { IsIn, IsOptional, IsString } from 'class-validator';

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

  /** Printed invoice size: s compact · m normal · l large (default) · xl extra large */
  @IsOptional()
  @IsIn(['s', 'm', 'l', 'xl'])
  invoice_print_size?: 's' | 'm' | 'l' | 'xl';

  @IsOptional()
  @IsIn(['auto', 'gst', 'tally', 'busy', 'marg', 'thermal'])
  invoice_template?: 'auto' | 'gst' | 'tally' | 'busy' | 'marg' | 'thermal';

  @IsOptional()
  @IsString()
  invoice_qr_url?: string | null;

  @IsOptional()
  @IsIn(['with_bank', 'bottom_left', 'bottom_right'])
  invoice_qr_position?: 'with_bank' | 'bottom_left' | 'bottom_right';

  @IsOptional()
  @IsString()
  invoice_qr_caption?: string | null;

  @IsOptional()
  @IsString()
  invoice_upi_id?: string | null;
}
