import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public';
import { MallService } from './mall.service';
import { MarketplacePaymentsService } from './marketplace-payments.service';

@Controller('public/mall')
@Public()
export class PublicMallController {
  constructor(
    private readonly mall: MallService,
    private readonly payments: MarketplacePaymentsService,
  ) {}

  @Get('categories')
  categories(@Query('pincode') pincode?: string) {
    return this.mall.publicCategories(pincode);
  }

  @Get('items')
  items(
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('seller') seller?: string,
    @Query('pincode') pincode?: string,
    @Query('page') page?: string,
    @Query('page_size') page_size?: string,
  ) {
    return this.mall.publicItems({
      category,
      q,
      seller,
      pincode,
      page: page ? parseInt(page, 10) : 1,
      page_size: page_size ? parseInt(page_size, 10) : 24,
    });
  }

  @Get('items/:id')
  item(@Param('id') id: string) {
    return this.mall.publicItemDetail(id);
  }

  @Post('checkout')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  checkout(
    @Body()
    body: {
      seller_tenant_id: string;
      buyer: { name: string; phone: string; address?: string | Record<string, unknown> };
      delivery_mode?: string;
      lines: Array<{ item_id: string; qty: number }>;
    },
  ) {
    return this.mall.checkout(body);
  }

  @Get('orders/:token')
  track(@Param('token') token: string) {
    return this.mall.publicTrack(token);
  }

  @Post('payments/order')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  paymentOrder(@Body() body: { marketplace_order_id: string }) {
    return this.payments.createMallRazorpayOrder(body.marketplace_order_id);
  }

  @Post('payments/confirm')
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  paymentConfirm(
    @Body()
    body: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ) {
    return this.payments.confirmMallPayment(body);
  }
}
