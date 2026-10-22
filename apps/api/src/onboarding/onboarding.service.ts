import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Company } from '../tenant/entities/company.entity';
import { Branch } from '../tenant/entities/branch.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Customer } from '../crm/entities/customer.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { OnboardingEvent } from './entities/onboarding-event.entity';
import { OnboardingSurvey } from './entities/onboarding-survey.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';
import { TenantContext } from '../common/tenant-context';
import { isInvoicingLiteBusinessType, isPosBusinessType } from '../common/tenant-client-types';
import { SaveWorkspaceDto } from './dto/save-workspace.dto';
import { brandingForBusinessType } from '../common/variant-theme';
import { getClientPack } from '../growth/client-packs';

export interface ChecklistStep {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

export interface OnboardingChecklistResponse {
  steps: ChecklistStep[];
  onboardingCompletedAt: string | null;
  showOnboarding: boolean;
  tenantSlug?: string;
  businessType?: string;
  enabledModules?: string[];
  workspaceConfigured?: boolean;
  canConfigure?: boolean;
  homeHref?: string;
}

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(SalesInvoice)
    private readonly invoiceRepo: Repository<SalesInvoice>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(OnboardingEvent)
    private readonly eventRepo: Repository<OnboardingEvent>,
    @InjectRepository(OnboardingSurvey)
    private readonly surveyRepo: Repository<OnboardingSurvey>,
  ) {}

  async getChecklist(ctx: TenantContext): Promise<OnboardingChecklistResponse> {
    if (ctx.isSuperAdmin || !ctx.tenantId) {
      return {
        steps: [],
        onboardingCompletedAt: null,
        showOnboarding: false,
      };
    }
    const tenant = await this.tenantRepo.findOne({
      where: { id: ctx.tenantId },
      select: ['slug', 'settings'],
    });
    const tenantSlug = tenant?.slug ?? undefined;
    const settings = tenant?.settings as Record<string, unknown> | undefined;
    const businessType = typeof settings?.business_type === 'string' ? settings.business_type : '';
    const user = await this.userRepo.findOne({
      where: { id: ctx.userId },
      select: ['id', 'onboarding_completed_at'],
    });
    const canConfigure = ctx.isSuperAdmin || ctx.permissions.includes('*') || ctx.permissions.includes('org.company.update');
    const enabledModules = Array.isArray(settings?.enabled_modules)
      ? (settings.enabled_modules as string[]).filter((m) => typeof m === 'string')
      : [];
    const workspaceConfigured = settings?.workspace_configured === true;
    const homeHref =
      tenantSlug === 'ice-crest' || businessType === 'ice_crest'
        ? '/ice-crest/dashboard'
        : isInvoicingLiteBusinessType(businessType)
          ? '/invoice-lite'
          : businessType === 'dine_restaurant' || businessType === 'cafe'
            ? '/pos/floor'
            : isPosBusinessType(businessType)
              ? '/pos'
              : '/dashboard';
    const extra = {
      tenantSlug,
      businessType: businessType || undefined,
      enabledModules,
      workspaceConfigured,
      canConfigure,
      homeHref,
    };
    const [companyCount, branchCount, customerCount, invoiceCount] = await Promise.all([
      this.companyRepo.count({ where: { tenant_id: ctx.tenantId } }),
      this.branchRepo
        .createQueryBuilder('branch')
        .innerJoin(Company, 'company', 'company.id = branch.company_id')
        .where('company.tenant_id = :tid', { tid: ctx.tenantId })
        .getCount(),
      this.customerRepo.count({ where: { tenant_id: ctx.tenantId } }),
      this.invoiceRepo.count({ where: { tenant_id: ctx.tenantId } }),
    ]);

    const isIceCrestTenant = tenantSlug === 'ice-crest' || settings?.business_type === 'ice_crest';
    const isInvoiceLite = isInvoicingLiteBusinessType(businessType);
    const isPosTenant = isPosBusinessType(businessType);
    const payu = (settings?.payu ?? settings?.razorpay ?? {}) as { enabled?: boolean; key?: string; key_id?: string; salt?: string; key_secret?: string };
    const payuKey = typeof payu.key === 'string' ? payu.key : typeof payu.key_id === 'string' ? payu.key_id : '';
    const payuSalt = payu.salt || payu.key_secret;
    const paymentsReady = payu.enabled === true && Boolean(payuKey) && Boolean(payuSalt);

    if (isIceCrestTenant) {
      const steps: ChecklistStep[] = [
        { id: 'ic_dashboard', label: 'Review your Ice Crest dashboard', done: invoiceCount > 0, href: '/ice-crest/dashboard' },
        { id: 'ic_stock', label: 'Record stock inward for at least one SKU', done: false, href: '/ice-crest/stock-movements' },
        { id: 'ic_customer', label: 'Add a customer or capture a lead', done: customerCount > 0, href: '/crm/leads' },
        { id: 'ic_company', label: 'Confirm company GSTIN, bank & logo', done: companyCount > 0, href: '/organization/companies' },
        { id: 'ic_printer', label: 'Connect a printer (USB, Wi-Fi or Bluetooth)', done: false, href: '/organization/printers' },
        { id: 'ic_payments', label: 'Connect PayU for scan-to-pay on invoices', done: paymentsReady, href: '/organization/payments' },
      ];
      return {
        steps,
        onboardingCompletedAt: user?.onboarding_completed_at?.toISOString() ?? null,
        showOnboarding: !user?.onboarding_completed_at,
        ...extra,
      };
    }

    if (isInvoiceLite) {
      const branding = (settings?.branding ?? {}) as { invoice_template?: string };
      const themePicked = Boolean(branding.invoice_template);
      const steps: ChecklistStep[] = [
        { id: 'lite_company', label: 'Confirm company name & GSTIN', done: companyCount > 0, href: '/organization/companies' },
        { id: 'lite_customer', label: 'Add your first customer', done: customerCount > 0, href: '/crm/customers/new' },
        { id: 'lite_estimate', label: 'Give a rate / estimate to a customer', done: false, href: '/invoice-lite/quotes/new' },
        { id: 'lite_follow', label: 'Set a call-back reminder on an estimate', done: false, href: '/invoice-lite/follow-ups' },
        { id: 'lite_theme', label: 'Pick bill print style (GST / Tally / Busy / Marg)', done: themePicked, href: '/organization/branding' },
        { id: 'lite_invoice', label: 'Create your first bill', done: invoiceCount > 0, href: '/sales/invoices/new' },
        { id: 'lite_printer', label: 'Connect a printer (USB, Wi-Fi, internet or Bluetooth)', done: false, href: '/organization/printers' },
      ];
      return {
        steps,
        onboardingCompletedAt: user?.onboarding_completed_at?.toISOString() ?? null,
        showOnboarding: !user?.onboarding_completed_at,
        ...extra,
      };
    }

    if (isPosTenant) {
      const itemWord =
        businessType === 'dine_restaurant' || businessType === 'cafe' ? 'menu item' :
        businessType === 'sweet_shop' ? 'sweet' :
        businessType === 'bakery' ? 'bake item' :
        businessType === 'garment_shop' ? 'garment' :
        businessType === 'pharmacy' ? 'medicine' :
        businessType === 'salon' || businessType === 'clinic' ? 'service' :
        businessType === 'jewellery_shop' ? 'piece' :
        businessType === 'florist' ? 'arrangement' :
        businessType === 'auto_parts' ? 'part' : 'product';
      const steps: ChecklistStep[] = [
        { id: 'pos_items', label: `Add your first ${itemWord}s for the counter`, done: false, href: '/inventory/items/new' },
        { id: 'pos_bill', label: 'Take your first bill at the counter', done: invoiceCount > 0, href: '/pos' },
        { id: 'setup_printer', label: 'Connect the counter printer (USB, Wi-Fi or Bluetooth)', done: false, href: '/organization/printers' },
        { id: 'pos_payments', label: 'Connect Razorpay for scan-to-pay on bills', done: paymentsReady, href: '/organization/payments' },
      ];
      return {
        steps,
        onboardingCompletedAt: user?.onboarding_completed_at?.toISOString() ?? null,
        showOnboarding: !user?.onboarding_completed_at,
        ...extra,
      };
    }

    const steps: ChecklistStep[] = [
      { id: 'add_company', label: 'Add your first company', done: companyCount > 0, href: '/organization/companies' },
      { id: 'add_branch', label: 'Add a branch (optional)', done: branchCount > 0, href: '/organization/companies' },
      { id: 'add_customer', label: 'Add your first customer or vendor', done: customerCount > 0, href: '/crm/customers' },
      { id: 'create_invoice', label: 'Create your first invoice', done: invoiceCount > 0, href: '/sales/invoices' },
      { id: 'setup_printer', label: 'Connect a printer (USB, Wi-Fi, internet or Bluetooth)', done: false, href: '/organization/printers' },
      { id: 'setup_payments', label: 'Connect Razorpay for scan-to-pay on invoices', done: paymentsReady, href: '/organization/payments' },
    ];

    return {
      steps,
      onboardingCompletedAt: user?.onboarding_completed_at?.toISOString() ?? null,
      showOnboarding: !user?.onboarding_completed_at,
      ...extra,
    };
  }

  async saveWorkspace(ctx: TenantContext, dto: SaveWorkspaceDto) {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    const canConfigure = ctx.isSuperAdmin || ctx.permissions.includes('*') || ctx.permissions.includes('org.company.update');
    if (!canConfigure) throw new ForbiddenException('Ask a workspace admin to choose the shop type and modules.');

    const tenant = await this.tenantRepo.findOne({ where: { id: ctx.tenantId } });
    if (!tenant) throw new ForbiddenException('Workspace not found');

    const allowed = new Set(['inventory', 'sales', 'crm', 'purchase', 'accounting', 'reports', 'hr', 'service', 'transport']);
    const picked = (dto.enabledModules || []).filter((m) => allowed.has(m));
    const enabledModules = Array.from(new Set(['organization', 'onboarding', 'help', 'dashboard', ...(picked.length ? picked : ['sales', 'inventory', 'reports'])]));

    tenant.settings = {
      ...(tenant.settings ?? {}),
      business_type: dto.businessType,
      enabled_modules: enabledModules,
      workspace_configured: true,
      learn_mode: dto.learnMode || 'explore',
      branding: brandingForBusinessType(dto.businessType, tenant.settings as Record<string, unknown>),
    };
    await this.tenantRepo.save(tenant);

    if (isPosBusinessType(dto.businessType)) {
      await this.ensurePosBasics(ctx.tenantId);
    }

    const pack = getClientPack(dto.businessType);
    if (pack?.modules?.length) {
      const mods = Array.from(
        new Set(['organization', 'onboarding', 'help', 'dashboard', ...pack.modules, ...picked]),
      );
      tenant.settings = { ...(tenant.settings ?? {}), enabled_modules: mods };
      const features = new Set([...(tenant.features ?? []), ...pack.features]);
      tenant.features = [...features];
      await this.tenantRepo.save(tenant);
      enabledModules.splice(0, enabledModules.length, ...mods);
    }

    const done = await this.completeOnboarding(ctx);
    let homeHref = '/dashboard';
    if (dto.businessType === 'ice_crest') homeHref = '/ice-crest/dashboard';
    else if (dto.businessType === 'dine_restaurant' || dto.businessType === 'cafe') homeHref = '/pos/floor';
    else if (isPosBusinessType(dto.businessType)) homeHref = '/pos';
    return {
      ...done,
      homeHref,
      learnMode: dto.learnMode || 'explore',
      businessType: dto.businessType,
      enabledModules,
    };
  }

  private async ensurePosBasics(tenantId: string) {
    const company = await this.companyRepo.findOne({ where: { tenant_id: tenantId }, order: { is_default: 'DESC' } });
    if (!company) return;
    const walk = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tid', { tid: tenantId })
      .andWhere(`(c.tags @> :tag OR c.name ILIKE '%walk%')`, { tag: JSON.stringify(['walk_in']) })
      .getOne();
    if (!walk) {
      await this.customerRepo.save(
        this.customerRepo.create({
          tenant_id: tenantId,
          company_id: company.id,
          name: 'Walk-in / Counter',
          entity_type: 'individual',
          tags: ['walk_in'],
          segment: 'counter',
        }),
      );
    }
    const warehouse = await this.warehouseRepo.findOne({ where: { tenant_id: tenantId } });
    if (!warehouse) {
      await this.warehouseRepo.save(
        this.warehouseRepo.create({
          tenant_id: tenantId,
          company_id: company.id,
          name: 'Shop counter',
          code: 'COUNTER',
          is_default: true,
        }),
      );
    }
  }

  async completeOnboarding(ctx: TenantContext): Promise<{ onboardingCompletedAt: string }> {
    if (!ctx.userId) throw new ForbiddenException('User required');
    const now = new Date();
    await this.userRepo.update(ctx.userId, { onboarding_completed_at: now });
    return { onboardingCompletedAt: now.toISOString() };
  }

  async trackEvent(ctx: TenantContext, eventName: string, payload?: Record<string, unknown>): Promise<void> {
    await this.eventRepo.save(
      this.eventRepo.create({
        tenant_id: ctx.tenantId ?? null,
        user_id: ctx.userId ?? null,
        event_name: eventName,
        payload: payload ?? {},
      }),
    );
  }

  async submitSurvey(ctx: TenantContext, rating?: number, feedback?: string): Promise<{ ok: boolean }> {
    await this.surveyRepo.save(
      this.surveyRepo.create({
        tenant_id: ctx.tenantId ?? null,
        user_id: ctx.userId ?? null,
        rating: rating ?? null,
        feedback: feedback ?? null,
      }),
    );
    return { ok: true };
  }
}
