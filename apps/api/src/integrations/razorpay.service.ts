import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { InvoicePayment } from '../sales/entities/invoice-payment.entity';
import { SalesService } from '../sales/sales.service';
import {
  decryptSecret,
  parseInvoicePayToken,
  parseTenantRazorpay,
  paiseToRupees,
  razorpayReady,
  razorpayRequest,
  razorpayWebhookUrl,
  rupeesToPaise,
  TenantRazorpay,
  verifyRazorpaySignature,
  buildInvoicePaySlip,
  InvoicePaySlip,
} from '../common/tenant-razorpay';

export type { InvoicePaySlip };

@Injectable()
export class RazorpayService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(SalesInvoice)
    private readonly invoiceRepo: Repository<SalesInvoice>,
    @InjectRepository(InvoicePayment)
    private readonly paymentRepo: Repository<InvoicePayment>,
    private readonly salesService: SalesService,
  ) {}

  cfgFor(settings: Record<string, unknown> | null | undefined): TenantRazorpay {
    return parseTenantRazorpay(settings);
  }

  async getSlipForInvoice(invoice: SalesInvoice, settings: Record<string, unknown> | null | undefined): Promise<InvoicePaySlip> {
    return buildInvoicePaySlip(this.cfgFor(settings), invoice);
  }

  async publicInvoice(token: string) {
    const parsed = parseInvoicePayToken(token);
    if (!parsed) throw new BadRequestException('Invalid payment link');
    const invoice = await this.invoiceRepo.findOne({
      where: { id: parsed.invoiceId, tenant_id: parsed.tenantId },
      relations: ['company', 'customer'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const tenant = await this.tenantRepo.findOne({ where: { id: parsed.tenantId } });
    const cfg = this.cfgFor(tenant?.settings as Record<string, unknown>);
    if (!razorpayReady(cfg)) throw new ForbiddenException('Online payment is not enabled for this workspace');
    if (invoice.status === 'cancelled' || invoice.status === 'void') {
      throw new BadRequestException('This invoice cannot be paid');
    }
    const total = parseFloat(invoice.total);
    const paid = parseFloat(invoice.paid_amount ?? '0');
    const outstanding = Math.round((total - paid) * 100) / 100;
    const company = invoice.company as { name?: string } | undefined;
    const customer = invoice.customer as { name?: string; email?: string; phone?: string } | null;
    return {
      invoice_id: invoice.id,
      number: invoice.number,
      company: company?.name || 'Invoice',
      customer: customer?.name || '',
      total,
      paid,
      outstanding,
      accept_partial: cfg.accept_partial,
      min_partial_rupees: cfg.min_partial_rupees,
      currency: 'INR',
      status: invoice.status,
    };
  }

  async createCheckoutOrder(token: string, amountRupees?: number) {
    const parsed = parseInvoicePayToken(token);
    if (!parsed) throw new BadRequestException('Invalid payment link');
    const invoice = await this.invoiceRepo.findOne({
      where: { id: parsed.invoiceId, tenant_id: parsed.tenantId },
      relations: ['company', 'customer'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const tenant = await this.tenantRepo.findOne({ where: { id: parsed.tenantId } });
    const cfg = this.cfgFor(tenant?.settings as Record<string, unknown>);
    if (!razorpayReady(cfg)) throw new ForbiddenException('Online payment is not enabled');
    if (invoice.status === 'cancelled' || invoice.status === 'void') {
      throw new BadRequestException('This invoice cannot be paid');
    }
    const total = parseFloat(invoice.total);
    const paid = parseFloat(invoice.paid_amount ?? '0');
    const outstanding = Math.round((total - paid) * 100) / 100;
    if (outstanding < 1) throw new BadRequestException('This invoice is already paid');
    let amount = outstanding;
    if (amountRupees != null && Number.isFinite(Number(amountRupees))) {
      amount = Math.round(Number(amountRupees) * 100) / 100;
    }
    if (cfg.accept_partial) {
      if (amount < cfg.min_partial_rupees) {
        throw new BadRequestException(`Minimum payment is ₹${cfg.min_partial_rupees}`);
      }
      if (amount > outstanding) throw new BadRequestException('Amount is more than the balance due');
    } else if (Math.abs(amount - outstanding) > 0.05) {
      throw new BadRequestException('This workspace only accepts full payment of the balance');
    }
    const paise = rupeesToPaise(amount);
    if (paise < 100) throw new BadRequestException('Amount must be at least ₹1');
    const company = invoice.company as { name?: string } | undefined;
    const order = await razorpayRequest<{ id: string; amount: number }>(
      cfg.key_id,
      decryptSecret(cfg.key_secret),
      'POST',
      '/orders',
      {
        amount: paise,
        currency: 'INR',
        receipt: String(invoice.number).slice(0, 40),
        payment_capture: 1,
        notes: {
          invoice_id: invoice.id,
          tenant_id: invoice.tenant_id,
          invoice_number: invoice.number,
        },
      },
    );
    return {
      key_id: cfg.key_id,
      order_id: order.id,
      amount: paise,
      currency: 'INR',
      name: company?.name || 'Payment',
      description: `Invoice ${invoice.number}`,
      prefill: {
        name: (invoice.customer as { name?: string } | null)?.name,
        email: (invoice.customer as { email?: string } | null)?.email,
        contact: (invoice.customer as { phone?: string } | null)?.phone,
      },
    };
  }

  async confirmCheckout(
    token: string,
    body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) {
    const parsed = parseInvoicePayToken(token);
    if (!parsed) throw new BadRequestException('Invalid payment link');
    const tenant = await this.tenantRepo.findOne({ where: { id: parsed.tenantId } });
    const cfg = this.cfgFor(tenant?.settings as Record<string, unknown>);
    const secret = decryptSecret(cfg.key_secret);
    const payload = `${body.razorpay_order_id}|${body.razorpay_payment_id}`;
    if (!verifyRazorpaySignature(payload, body.razorpay_signature, secret)) {
      throw new BadRequestException('Payment signature mismatch');
    }
    const payment = await razorpayRequest<{ amount: number; status: string; notes?: Record<string, string> }>(
      cfg.key_id,
      secret,
      'GET',
      `/payments/${body.razorpay_payment_id}`,
    );
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      throw new BadRequestException('Payment is not complete yet');
    }
    const invoice = await this.applyCapturedPayment(
      parsed.invoiceId,
      parsed.tenantId,
      paiseToRupees(payment.amount),
      body.razorpay_payment_id,
    );
    return { ok: true, invoice_id: invoice?.id, status: invoice?.status, paid_amount: invoice?.paid_amount };
  }

  async handleWebhook(rawBody: string, signature: string | undefined) {
    if (!signature) throw new ForbiddenException('Invalid webhook signature');
    let parsed: { event?: string; payload?: Record<string, { entity?: Record<string, unknown> }> };
    try {
      parsed = JSON.parse(rawBody) as typeof parsed;
    } catch {
      throw new BadRequestException('Invalid webhook body');
    }
    const paymentEntity = parsed.payload?.payment?.entity;
    const qrEntity = parsed.payload?.qr_code?.entity;
    const orderEntity = parsed.payload?.order?.entity;
    const linkEntity = parsed.payload?.payment_link?.entity;
    const notes = {
      ...((qrEntity?.notes as Record<string, string>) || {}),
      ...((orderEntity?.notes as Record<string, string>) || {}),
      ...((linkEntity?.notes as Record<string, string>) || {}),
      ...((paymentEntity?.notes as Record<string, string>) || {}),
    };
    const invoiceId = notes.invoice_id;
    const tenantId = notes.tenant_id;
    if (!invoiceId || !tenantId) throw new BadRequestException('Missing invoice notes');
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new ForbiddenException('Invalid webhook signature');
    const cfg = this.cfgFor(tenant.settings as Record<string, unknown>);
    const hookSecret = decryptSecret(cfg.webhook_secret) || decryptSecret(cfg.key_secret);
    if (!signature || !verifyRazorpaySignature(rawBody, signature, hookSecret)) {
      throw new ForbiddenException('Invalid webhook signature');
    }
    const event = parsed.event || '';
    if (!['payment.captured', 'payment.authorized', 'qr_code.credited', 'payment_link.paid'].includes(event)) {
      return { ok: true, ignored: event };
    }
    const paymentId = String(paymentEntity?.id || paymentEntity?.payment_id || linkEntity?.payment_id || '');
    const amountPaise = Number(paymentEntity?.amount ?? linkEntity?.amount_paid ?? 0);
    if (!paymentId || !amountPaise) return { ok: false, message: 'Missing payment amount' };
    await this.applyCapturedPayment(invoiceId, tenantId, paiseToRupees(amountPaise), paymentId);
    return { ok: true };
  }

  async applyCapturedPayment(invoiceId: string, tenantId: string, amount: number, paymentId: string) {
    const existing = await this.paymentRepo.findOne({ where: { invoice_id: invoiceId, reference: paymentId } });
    if (existing) {
      return this.invoiceRepo.findOne({ where: { id: invoiceId, tenant_id: tenantId } });
    }
    return this.salesService.recordPaymentByInvoiceId(invoiceId, amount, paymentId, tenantId);
  }

  async testKeys(keyId: string, keySecret: string): Promise<void> {
    await razorpayRequest(keyId, keySecret, 'GET', '/payments?count=1');
  }

  webhookUrl(): string {
    return razorpayWebhookUrl();
  }
}
