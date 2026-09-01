import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { SalesService } from '../sales/sales.service';
import { WhatsappSendDto } from './dto/whatsapp-send.dto';
import { WhatsappService } from './whatsapp.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly salesService: SalesService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Get('whatsapp/status')
  @UseGuards(JwtAuthGuard, TenantGuard)
  whatsappStatus() {
    return this.whatsappService.getStatus();
  }

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
  async whatsappWebhook(@Req() req: Request, @Body() body: unknown) {
    const raw = (req as Request & { rawBody?: string }).rawBody;
    const sig = req.headers['x-hub-signature-256'] as string | undefined;
    if (raw && !this.whatsappService.verifySignature(raw, sig)) {
      return { received: false, error: 'Invalid signature' };
    }
    return this.whatsappService.handleWebhook(body);
  }

  @Post('whatsapp/send')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async whatsappSend(@Body() body: WhatsappSendDto) {
    return this.whatsappService.send(body);
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
