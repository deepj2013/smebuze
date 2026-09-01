import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import { Repository } from 'typeorm';
import { WhatsappInboundMessage } from './entities/whatsapp-inbound-message.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Lead } from '../crm/entities/lead.entity';

type SendResult = { sent: boolean; message: string; to?: string; message_id?: string; mode?: string };

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(WhatsappInboundMessage) private readonly inboundRepo: Repository<WhatsappInboundMessage>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
  ) {}

  getStatus() {
    const configured = this.configured();
    const apiPublic = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
    return {
      configured,
      mode: configured ? 'live' : 'pending_credentials',
      phone_number_id_set: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      access_token_set: !!process.env.WHATSAPP_ACCESS_TOKEN,
      verify_token_hint: process.env.WHATSAPP_VERIFY_TOKEN ? '(set in .env)' : 'smebuzz_verify (default)',
      default_tenant: process.env.WHATSAPP_DEFAULT_TENANT_SLUG || 'ice-crest',
      webhook_url: `${apiPublic.replace(/\/$/, '')}/api/v1/integrations/whatsapp/webhook`,
      api_version: process.env.WHATSAPP_API_VERSION || 'v21.0',
      default_template: process.env.WHATSAPP_DEFAULT_TEMPLATE || null,
      auto_reply_enabled: !!process.env.WHATSAPP_AUTO_REPLY?.trim(),
      docs: 'docs/WHATSAPP_META_SETUP.md',
    };
  }

  verifySignature(rawBody: string, signatureHeader?: string): boolean {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret || !signatureHeader?.startsWith('sha256=')) return true;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return signatureHeader.slice(7) === expected;
  }

  private configured() {
    return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  private messagesUrl() {
    const version = process.env.WHATSAPP_API_VERSION || 'v21.0';
    return `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  }

  normalizePhone(to: string): string {
    const digits = to.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }

  async send(body: { to: string; template?: string; text?: string; params?: Record<string, string> }): Promise<SendResult> {
    const to = this.normalizePhone(body.to);
    if (!to) return { sent: false, message: 'Valid phone number required (e.g. 919876543210)' };

    const text = body.text?.trim() || body.params?.body?.trim();
    if (!this.configured()) {
      return {
        sent: false,
        mode: 'pending_credentials',
        message: 'Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to .env — see docs/WHATSAPP_META_SETUP.md',
        to,
      };
    }

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
    };

    const templateName = body.template && body.template !== 'generic' ? body.template : process.env.WHATSAPP_DEFAULT_TEMPLATE;
    if (templateName && !text) {
      payload.type = 'template';
      payload.template = {
        name: templateName,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
        ...(body.params?.body ? {
          components: [{
            type: 'body',
            parameters: [{ type: 'text', text: body.params.body.slice(0, 1024) }],
          }],
        } : {}),
      };
    } else {
      payload.type = 'text';
      payload.text = { preview_url: true, body: text || 'Message from Ice Crest CRM' };
    }

    try {
      const res = await fetch(this.messagesUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
      if (!res.ok) {
        const hint = json.error?.code === 131030 ? ' Add recipient as test number in Meta → WhatsApp → API Setup (dev mode).' : '';
        return { sent: false, message: (json.error?.message || `WhatsApp API error (${res.status})`) + hint, to, mode: 'live' };
      }
      return { sent: true, message: 'Message sent via WhatsApp Cloud API', to, message_id: json.messages?.[0]?.id, mode: 'live' };
    } catch (e) {
      return { sent: false, message: e instanceof Error ? e.message : 'WhatsApp send failed', to };
    }
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
            const autoReply = process.env.WHATSAPP_AUTO_REPLY?.trim();
            if (autoReply && this.configured()) {
              await this.send({ to: from, text: autoReply }).catch((err) => this.logger.warn(`Auto-reply failed: ${err}`));
            }
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
