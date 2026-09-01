import { Body, Controller, Get, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { WhatsappSendDto, WhatsappTemplatesDto } from './dto/whatsapp-send.dto';
import { WhatsappService } from './whatsapp.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('whatsapp/status')
  @UseGuards(JwtAuthGuard, TenantGuard)
  whatsappStatus(@CurrentTenant() ctx: TenantContext) {
    return this.whatsappService.getStatus(ctx);
  }

  @Patch('whatsapp/templates')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions('org.company.update')
  saveWhatsappTemplates(@Body() body: WhatsappTemplatesDto, @CurrentTenant() ctx: TenantContext) {
    return this.whatsappService.saveTemplates(ctx, body);
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
  async whatsappSend(@Body() body: WhatsappSendDto, @CurrentTenant() ctx: TenantContext) {
    return this.whatsappService.send(body, ctx);
  }

  @Post('payment-webhook')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @RequirePermissions('org.company.update')
  async paymentWebhook() {
    return {
      ok: false,
      message: 'Use POST /api/v1/integrations/razorpay/webhook with the Razorpay signature. Unsigned payment webhooks are disabled.',
    };
  }
}
