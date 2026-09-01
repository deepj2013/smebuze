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
import { TenantContext } from '../common/tenant-context';

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
    const user = await this.userRepo.findOne({
      where: { id: ctx.userId },
      select: ['id', 'onboarding_completed_at'],
    });
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
    const businessType = typeof settings?.business_type === 'string' ? settings.business_type : '';
    const isPosTenant = ['dine_restaurant', 'sweet_shop', 'garment_shop', 'retail_shop'].includes(businessType);
    const razorpay = (settings?.razorpay ?? {}) as { enabled?: boolean; key_id?: string; key_secret?: string };
    const paymentsReady = razorpay.enabled === true && typeof razorpay.key_id === 'string' && razorpay.key_id.startsWith('rzp_') && Boolean(razorpay.key_secret);

    if (isIceCrestTenant) {
      const steps: ChecklistStep[] = [
        { id: 'ic_dashboard', label: 'Review your Ice Crest dashboard', done: invoiceCount > 0, href: '/ice-crest/dashboard' },
        { id: 'ic_stock', label: 'Record stock inward for at least one SKU', done: false, href: '/ice-crest/stock-movements' },
        { id: 'ic_customer', label: 'Add a customer or capture a lead', done: customerCount > 0, href: '/crm/leads' },
        { id: 'ic_company', label: 'Confirm company GSTIN, bank & logo', done: companyCount > 0, href: '/organization/companies' },
        { id: 'ic_printer', label: 'Connect a printer (USB, Wi-Fi or Bluetooth)', done: false, href: '/organization/printers' },
        { id: 'ic_payments', label: 'Connect Razorpay for scan-to-pay on invoices', done: paymentsReady, href: '/organization/payments' },
      ];
      return {
        steps,
        onboardingCompletedAt: user?.onboarding_completed_at?.toISOString() ?? null,
        showOnboarding: !user?.onboarding_completed_at,
        tenantSlug,
      };
    }

    if (isPosTenant) {
      const itemWord =
        businessType === 'dine_restaurant' ? 'menu item' :
        businessType === 'sweet_shop' ? 'sweet' :
        businessType === 'garment_shop' ? 'garment' : 'product';
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
        tenantSlug,
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
      tenantSlug,
    };
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
