import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../common/decorators/public';
import { SalesService } from '../sales/sales.service';
import { WhatsappSendDto } from './dto/whatsapp-send.dto';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly salesService: SalesService) {}
  @Public()
  @Get('whatsapp/webhook')
  async whatsappWebhookVerify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'smebuzz_verify';
    if (mode === 'subscribe' && verifyToken === expectedToken && challenge) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send('Verification failed');
  }

  @Public()
  @Post('whatsapp/webhook')
  async whatsappWebhook(@Body() body: unknown) {
    return {
      received: true,
      message: 'WhatsApp webhook - integrate with WhatsApp Business API',
    };
  }

  @Post('whatsapp/send')
  async whatsappSend(@Body() body: WhatsappSendDto) {
    return {
      sent: true,
      message: 'WhatsApp send - integrate with WhatsApp Cloud API; use template messages for invoice link, payment reminder, etc.',
      to: body.to,
      template: body.template,
    };
  }

  @Public()
  @Post('payment-webhook')
  async paymentWebhook(@Body() body: { invoice_id?: string; amount?: number; payment_id?: string; gateway?: string }) {
    if (!body?.invoice_id || body?.amount == null) {
      return { ok: false, message: 'Missing invoice_id or amount' };
    }
    const updated = await this.salesService.recordPaymentByInvoiceId(body.invoice_id, Number(body.amount), body.payment_id ?? body.gateway);
    return { ok: !!updated, invoice_id: body.invoice_id };
  }
}
