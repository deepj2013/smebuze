import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import { Repository } from 'typeorm';
import { WhatsappInboundMessage } from './entities/whatsapp-inbound-message.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Lead } from '../crm/entities/lead.entity';
import { TenantContext } from '../common/tenant-context';

export type WhatsappTemplates = {
  reminder: string;
  invoice: string;
  quotation: string;
  order: string;
};

type SendInput = {
  to: string;
  template?: string;
  text?: string;
  params?: Record<string, string>;
  param?: string;
  fileUrl?: string;
  urlParam?: string;
  headUrl?: string;
  headParam?: string;
  name?: string;
  pdfName?: string;
};

type SendResult = { sent: boolean; message: string; to?: string; message_id?: string; mode?: string };

const EMPTY_TEMPLATES: WhatsappTemplates = { reminder: '', invoice: '', quotation: '', order: '' };

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(WhatsappInboundMessage) private readonly inboundRepo: Repository<WhatsappInboundMessage>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
  ) {}

  async getStatus(ctx?: TenantContext) {
    const templates = await this.readTemplates(ctx?.tenantId);
    return {
      configured: this.configured(),
      provider: 'ameerait',
      mode: this.configured() ? 'live' : 'pending',
      templates,
    };
  }

  async saveTemplates(ctx: TenantContext, incoming: Partial<WhatsappTemplates>): Promise<WhatsappTemplates> {
    if (!ctx.tenantId) return this.readTemplates(null);
    const tenant = await this.tenantRepo.findOne({ where: { id: ctx.tenantId } });
    if (!tenant) return this.readTemplates(null);
    const next: WhatsappTemplates = {
      ...(await this.readTemplates(ctx.tenantId)),
      ...Object.fromEntries(
        Object.entries(incoming).map(([k, v]) => [k, String(v ?? '').trim()]),
      ) as WhatsappTemplates,
    };
    tenant.settings = { ...(tenant.settings ?? {}), whatsapp_templates: next };
    await this.tenantRepo.save(tenant);
    return next;
  }

  verifySignature(rawBody: string, signatureHeader?: string): boolean {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret || !signatureHeader?.startsWith('sha256=')) return true;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return signatureHeader.slice(7) === expected;
  }

  private configured() {
    return !!(process.env.WHATSAPP_AMEERA_LICENSE && process.env.WHATSAPP_AMEERA_API_KEY);
  }

  normalizePhone(to: string): string {
    const digits = to.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }

  async send(body: SendInput, ctx?: TenantContext): Promise<SendResult> {
    const to = this.normalizePhone(body.to);
    if (!to) return { sent: false, message: 'Enter a 10-digit mobile number.' };

    if (!this.configured()) {
      return {
        sent: false,
        mode: 'pending',
        message: 'WhatsApp is not connected yet. Ask your admin to finish setup.',
        to,
      };
    }

    const templates = await this.readTemplates(ctx?.tenantId);
    const requested = (body.template || '').trim();
    const mapped =
      requested && requested in templates
        ? templates[requested as keyof WhatsappTemplates]
        : requested;
    const templateName = mapped || templates.reminder || process.env.WHATSAPP_DEFAULT_TEMPLATE || '';
    if (!templateName) {
      return {
        sent: false,
        mode: 'pending',
        message: 'Match a WhatsApp template first (Organization → WhatsApp).',
        to,
      };
    }

    const param =
      body.param?.trim() ||
      body.params?.body?.trim() ||
      body.text?.trim() ||
      '';

    const endpoint = process.env.WHATSAPP_AMEERA_URL || 'https://login.ameerait.com/api/sendtemplate.php';
    const url = new URL(endpoint);
    url.searchParams.set('LicenseNumber', process.env.WHATSAPP_AMEERA_LICENSE || '');
    url.searchParams.set('APIKey', process.env.WHATSAPP_AMEERA_API_KEY || '');
    url.searchParams.set('Contact', to);
    url.searchParams.set('Template', templateName);
    if (param) url.searchParams.set('Param', param);
    if (body.fileUrl) url.searchParams.set('Fileurl', body.fileUrl);
    if (body.urlParam) url.searchParams.set('URLParam', body.urlParam);
    if (body.headUrl) url.searchParams.set('HeadURL', body.headUrl);
    if (body.headParam) url.searchParams.set('HeadParam', body.headParam);
    if (body.name) url.searchParams.set('Name', body.name);
    if (body.pdfName) url.searchParams.set('PDFName', body.pdfName);

    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      const raw = await res.text();
      const ok = res.ok && !/fail|error|invalid|denied/i.test(raw);
      if (!ok) {
        this.logger.warn(`AmeeraIT send failed (${res.status}): ${raw.slice(0, 300)}`);
        return { sent: false, message: 'WhatsApp could not send. Check the template name and phone number.', to, mode: 'live' };
      }
      return { sent: true, message: 'WhatsApp message sent', to, mode: 'live' };
    } catch (e) {
      this.logger.error(e instanceof Error ? e.stack : String(e));
      return { sent: false, message: 'WhatsApp could not send. Try again in a moment.', to };
    }
  }

  private async readTemplates(tenantId?: string | null): Promise<WhatsappTemplates> {
    const fromEnv: WhatsappTemplates = {
      reminder: process.env.WHATSAPP_TEMPLATE_REMINDER || '',
      invoice: process.env.WHATSAPP_TEMPLATE_INVOICE || '',
      quotation: process.env.WHATSAPP_TEMPLATE_QUOTATION || '',
      order: process.env.WHATSAPP_TEMPLATE_ORDER || '',
    };
    if (!tenantId) return { ...EMPTY_TEMPLATES, ...fromEnv };
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const saved = (tenant?.settings?.whatsapp_templates ?? {}) as Partial<WhatsappTemplates>;
    return { ...fromEnv, ...saved };
  }

  async handleWebhook(body: unknown): Promise<{ received: boolean; leads_created: number }> {
    let leadsCreated = 0;
    const root = body as { entry?: Array<{ changes?: Array<{ value?: Record<string, unknown> }> }> };
    for (const entry of root.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const messages = (value.messages as Array<Record<string, unknown>>) ?? [];
        const contacts = (value.contacts as Array<{ wa_id?: string; profile?: { name?: string } }>) ?? [];
        for (const msg of messages) {
          const from = String(msg.from ?? '');
          if (!from) continue;
          const waId = msg.id ? String(msg.id) : null;
          if (waId && (await this.inboundRepo.findOne({ where: { wa_message_id: waId } }))) continue;

          const contact = contacts.find((c) => c.wa_id === from);
          const textBody = msg.type === 'text' ? String((msg.text as { body?: string })?.body ?? '') : `[${msg.type}]`;
          const tenantSlug = process.env.WHATSAPP_DEFAULT_TENANT_SLUG || 'ice-crest';
          const tenant = await this.tenantRepo.findOne({ where: { slug: tenantSlug } });

          let leadId: string | null = null;
          if (tenant && textBody.trim()) {
            const lead = await this.leadRepo.save(this.leadRepo.create({
              tenant_id: tenant.id,
              company_id: null,
              source: 'whatsapp',
              name: contact?.profile?.name?.trim() || `WhatsApp ${from}`,
              phone: from,
              email: null,
              stage: 'new',
              deal_stage: 'lead',
              tags: ['whatsapp'],
              metadata: { message: textBody, wa_id: from },
            }));
            leadId = lead.id;
            leadsCreated++;
          }

          await this.inboundRepo.save(this.inboundRepo.create({
            tenant_id: tenant?.id ?? null,
            wa_message_id: waId,
            from_phone: from,
            profile_name: contact?.profile?.name ?? null,
            message_type: String(msg.type ?? 'text'),
            body: textBody || null,
            raw_payload: msg as Record<string, unknown>,
            lead_id: leadId,
            processed_at: new Date(),
          }));
        }
      }
    }
    return { received: true, leads_created: leadsCreated };
  }
}
