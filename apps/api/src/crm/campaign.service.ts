import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactCategory } from './entities/contact-category.entity';
import { MessageTemplate } from './entities/message-template.entity';
import { TenantContext } from '../common/tenant-context';

@Injectable()
export class CampaignService {
  constructor(
    @InjectRepository(ContactCategory)
    private readonly categoryRepo: Repository<ContactCategory>,
    @InjectRepository(MessageTemplate)
    private readonly templateRepo: Repository<MessageTemplate>,
  ) {}

  private assertTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant context required');
    return ctx.tenantId;
  }

  // ——— Contact categories ———
  async getCategories(ctx: TenantContext): Promise<ContactCategory[]> {
    const tenantId = this.assertTenantId(ctx);
    return this.categoryRepo.find({
      where: { tenant_id: tenantId },
      order: { name: 'ASC' },
    });
  }

  async createCategory(
    dto: { name: string; slug?: string; description?: string },
    ctx: TenantContext,
  ): Promise<ContactCategory> {
    const tenantId = this.assertTenantId(ctx);
    const slug = dto.slug ?? dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const cat = this.categoryRepo.create({
      tenant_id: tenantId,
      name: dto.name,
      slug,
      description: dto.description ?? null,
    });
    return this.categoryRepo.save(cat);
  }

  async updateCategory(
    id: string,
    dto: { name?: string; description?: string },
    ctx: TenantContext,
  ): Promise<ContactCategory> {
    const cat = await this.getCategoryById(id, ctx);
    if (dto.name != null) cat.name = dto.name;
    if (dto.description != null) cat.description = dto.description;
    return this.categoryRepo.save(cat);
  }

  async getCategoryById(id: string, ctx: TenantContext): Promise<ContactCategory> {
    const tenantId = this.assertTenantId(ctx);
    const cat = await this.categoryRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  // ——— Message templates ———
  async getTemplates(ctx: TenantContext): Promise<MessageTemplate[]> {
    const tenantId = this.assertTenantId(ctx);
    return this.templateRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async createTemplate(
    dto: { name: string; subject?: string; body: string; channel?: string },
    ctx: TenantContext,
  ): Promise<MessageTemplate> {
    const tenantId = this.assertTenantId(ctx);
    const t = this.templateRepo.create({
      tenant_id: tenantId,
      name: dto.name,
      subject: dto.subject ?? null,
      body: dto.body,
      channel: dto.channel ?? 'email',
    });
    return this.templateRepo.save(t);
  }

  async getTemplateById(id: string, ctx: TenantContext): Promise<MessageTemplate> {
    const tenantId = this.assertTenantId(ctx);
    const t = await this.templateRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async updateTemplate(
    id: string,
    dto: { name?: string; subject?: string; body?: string; channel?: string },
    ctx: TenantContext,
  ): Promise<MessageTemplate> {
    const t = await this.getTemplateById(id, ctx);
    if (dto.name != null) t.name = dto.name;
    if (dto.subject != null) t.subject = dto.subject;
    if (dto.body != null) t.body = dto.body;
    if (dto.channel != null) t.channel = dto.channel;
    return this.templateRepo.save(t);
  }

  /** Returns AI-generated message samples (placeholder / sample set). Replace with real AI later. */
  async getAiMessageSamples(ctx: TenantContext, purpose?: string): Promise<{ subject?: string; body: string }[]> {
    this.assertTenantId(ctx);
    const samples: { subject?: string; body: string }[] = [
      {
        subject: 'Quick follow-up – [Company]',
        body: 'Hi {{name}},\n\nI wanted to follow up on our recent conversation. We have a solution that could help {{company}} save time and reduce costs.\n\nWould you be open to a 15-minute call this week?\n\nBest regards',
      },
      {
        subject: 'Exclusive offer for your business',
        body: 'Hello {{name}},\n\nAs a valued contact, we’re offering a limited-time discount on our services. Use code WELCOME10 at checkout.\n\nReply to this email if you’d like to learn more.\n\nThanks',
      },
      {
        body: 'Hi {{name}}, hope you’re doing well. We’ve just launched a new feature that might be relevant for your team. Happy to share a short demo when it suits you. Let me know!',
      },
      {
        subject: 'Re: Your inquiry',
        body: 'Dear {{name}},\n\nThank you for your interest. Here are the details you requested:\n\n• Option A: [Details]\n• Option B: [Details]\n\nI’m available for a call to discuss. What time works for you?\n\nBest',
      },
    ];
    if (purpose) {
      return samples.slice(0, 2).map((s) => ({ ...s, body: s.body + `\n\n[Context: ${purpose}]` }));
    }
    return samples;
  }
}
