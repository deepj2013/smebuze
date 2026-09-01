import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ResendOtpDto, ResetPasswordOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { GoogleCompleteDto } from './dto/google-complete.dto';
import { Public } from '../common/decorators/public';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Get('google/status')
  googleStatus() {
    return this.authService.googleStatus();
  }

  @Public()
  @SkipThrottle()
  @Get('google')
  googleStart(@Res() res: Response) {
    if (!this.authService.googleConfigured()) {
      const front = (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001').replace(/\/$/, '');
      return res.redirect(`${front}/login?error=google_off`);
    }
    return res.redirect(this.authService.googleAuthUrl());
  }

  @Public()
  @SkipThrottle()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') googleError: string,
    @Res() res: Response,
  ) {
    const url = await this.authService.handleGoogleCallback(code, state, googleError);
    return res.redirect(url);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('google/complete')
  async googleComplete(@Body() dto: GoogleCompleteDto) {
    return this.authService.completeGoogleLogin(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('resend-otp')
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('reset-password-otp')
  async resetPasswordOtp(@Body() dto: ResetPasswordOtpDto) {
    return this.authService.resetPasswordWithOtp(dto);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('accept-invite')
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto.token, dto.password, dto.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async meGet(@CurrentTenant() ctx: TenantContext) {
    return this.authService.getMe(ctx);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  async me(@CurrentTenant() ctx: TenantContext) {
    return this.authService.getMe(ctx);
  }
}
