import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public';
import { PayuService } from './payu.service';

@Controller('pay')
export class PayController {
  constructor(private readonly payu: PayuService) {}

  @Public()
  @Get(':token')
  getInvoice(@Param('token') token: string) {
    return this.payu.publicInvoice(token);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post(':token/order')
  createOrder(@Param('token') token: string, @Body() body: { amount?: number }) {
    return this.payu.createCheckoutOrder(token, body?.amount);
  }
}
