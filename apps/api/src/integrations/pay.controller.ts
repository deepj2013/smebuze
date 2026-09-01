import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../common/decorators/public';
import { RazorpayService } from './razorpay.service';

@Controller('pay')
export class PayController {
  constructor(private readonly razorpay: RazorpayService) {}

  @Public()
  @Get(':token')
  getInvoice(@Param('token') token: string) {
    return this.razorpay.publicInvoice(token);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post(':token/order')
  createOrder(@Param('token') token: string, @Body() body: { amount?: number }) {
    return this.razorpay.createCheckoutOrder(token, body?.amount);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post(':token/confirm')
  confirm(
    @Param('token') token: string,
    @Body()
    body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) {
    return this.razorpay.confirmCheckout(token, body);
  }
}

@Controller('integrations/razorpay')
export class RazorpayWebhookController {
  constructor(private readonly razorpay: RazorpayService) {}

  @Public()
  @SkipThrottle()
  @HttpCode(200)
  @Post('webhook')
  webhook(@Req() req: Request & { rawBody?: Buffer | string }) {
    const raw = typeof req.rawBody === 'string' ? req.rawBody : req.rawBody?.toString('utf8') || JSON.stringify(req.body ?? {});
    const signature = String(req.headers['x-razorpay-signature'] || '');
    return this.razorpay.handleWebhook(raw, signature);
  }
}
