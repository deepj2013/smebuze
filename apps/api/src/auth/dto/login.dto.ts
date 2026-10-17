import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  /** Used only when the same email belongs to more than one workspace. */
  @IsOptional()
  @IsString()
  tenantSlug?: string;

  /** Used only when the same email is also a platform admin. */
  @IsOptional()
  @IsBoolean()
  platformAdmin?: boolean;

  /**
   * Stay signed in on this device (default true).
   * true → long-lived token (30d); false → short session (12h).
   */
  @IsOptional()
  @IsBoolean()
  remember_me?: boolean;
}
