import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { InvoicePayment } from '../sales/entities/invoice-payment.entity';
import { SalesService } from '../sales/sales.service';
import {
  buildHostedCheckoutForm,
  encryptSecret,
  makePayuTxnId,
  parseTenantPayu,
  payuReady,
  payuReturnUrl,
  type TenantPayu,
  verifyPayuTransaction,
} from '../common/payu';
import { buildInvoicePaySlip, parseInvoicePayToken, type InvoicePaySlip } from '../common/invoice-pay';

export type { InvoicePaySlip };

@Injectable()
export class PayuService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(SalesInvoice)
    private readonly invoiceRepo: Repository<SalesInvoice>,
    @InjectRepository(InvoicePayment)
    private readonly paymentRepo: Repository<InvoicePayment>,
    private readonly salesService: SalesService,
  ) {}

  cfgFor(settings: Record<string, unknown> | null | undefined): TenantPayu {
    return parseTenantPayu(settings);
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
    if (!payuReady(cfg)) throw new ForbiddenException('Online payment is not enabled for this workspace');
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
    if (!payuReady(cfg)) throw new ForbiddenException('Online payment is not enabled');
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
    if (amount < 1) throw new BadRequestException('Amount must be at least ₹1');

    const company = invoice.company as { name?: string } | undefined;
    const customer = invoice.customer as { name?: string; email?: string; phone?: string } | null;
    const txnid = makePayuTxnId('inv');
    await this.paymentRepo.save(
      this.paymentRepo.create({
        invoice_id: invoice.id,
        amount: String(amount),
        payment_date: new Date(),
        mode: 'payu_pending',
        reference: txnid,
      }),
    );

    const checkout = buildHostedCheckoutForm(cfg, {
      txnid,
      amountRupees: amount,
      productinfo: `Invoice ${invoice.number}`.slice(0, 100),
      firstname: (customer?.name || company?.name || 'Customer').slice(0, 60),
      email: (customer?.email || 'pay@smebuze.local').slice(0, 60),
      phone: customer?.phone || '',
      udf1: 'invoice',
      udf2: invoice.id,
      udf3: invoice.tenant_id,
      udf5: token,
    });

    return {
      checkout,
      txnid,
      amount_rupees: amount,
      currency: 'INR',
      name: company?.name || 'Payment',
      description: `Invoice ${invoice.number}`,
      return_url: payuReturnUrl(),
    };
  }

  async applyCapturedPayment(invoiceId: string, tenantId: string, amount: number, paymentId: string) {
    const existing = await this.paymentRepo.findOne({ where: { invoice_id: invoiceId, reference: paymentId } });
    if (existing && existing.mode !== 'payu_pending') {
      return this.invoiceRepo.findOne({ where: { id: invoiceId, tenant_id: tenantId } });
    }
    const pending = await this.paymentRepo.findOne({
      where: { invoice_id: invoiceId, reference: paymentId, mode: 'payu_pending' },
    });
    if (pending) await this.paymentRepo.remove(pending);
    return this.salesService.recordPaymentByInvoiceId(invoiceId, amount, paymentId, tenantId);
  }

  async verifyAndApplyInvoice(cfg: TenantPayu, txnid: string, mihpayid: string) {
    const pending = await this.paymentRepo.findOne({ where: { reference: txnid, mode: 'payu_pending' } });
    if (!pending) return null;
    const invoice = await this.invoiceRepo.findOne({ where: { id: pending.invoice_id } });
    if (!invoice) return null;
    const verified = await verifyPayuTransaction(cfg, txnid);
    if (verified.status !== 'success') return null;
    const amount = parseFloat(pending.amount);
    return this.applyCapturedPayment(invoice.id, invoice.tenant_id, amount, mihpayid || txnid);
  }

  async testKeys(key: string, salt: string): Promise<void> {
    const cfg = { key, salt: encryptSecret(salt), env: 'test' as const };
    await verifyPayuTransaction(cfg, 'invalid-txn-probe');
  }

  returnUrl(): string {
    return payuReturnUrl();
  }
}
