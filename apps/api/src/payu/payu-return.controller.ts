import { Controller, Post, Req, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public';
import { PayuReturnService } from './payu-return.service';

@Controller('payu')
export class PayuReturnController {
  constructor(private readonly returns: PayuReturnService) {}

  /** PayU posts payment result here (surl / furl). */
  @Public()
  @SkipThrottle()
  @Post('return')
  async return(@Req() req: Request, @Res() res: Response) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { redirect } = await this.returns.handleReturn(body);
    res.redirect(302, redirect);
  }
}
