import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../common/tenant-context';
import { TenantCommerceSettings } from './entities/tenant-commerce-settings.entity';
import { listAddonCatalog, addonPriceRupees } from './commerce-addons';
import {
  COMPLIANCE_CHECKLIST,
  CUSTOMER_PAYMENT_MODES,
  DEFAULT_PLATFORM_FEE_PCT,
  PAYMENT_MODE_COPY,
  customerChargeRupees,
  isCustomerPaymentMode,
} from './payment-modes';

const DELIVERY_MODES = new Set(['own', 'platform', 'both']);
const PAYMENT_MODES = new Set(CUSTOMER_PAYMENT_MODES);

@Injectable()
export class CommerceService {
  constructor(
    @InjectRepository(TenantCommerceSettings)
    private readonly settingsRepo: Repository<TenantCommerceSettings>,
  ) {}

  async getOrCreate(tenantId: string): Promise<TenantCommerceSettings> {
    let row = await this.settingsRepo.findOne({ where: { tenant_id: tenantId } });
    if (!row) {
      row = await this.settingsRepo.save(
        this.settingsRepo.create({
          tenant_id: tenantId,
          storefront_enabled: false,
          mall_enabled: false,
          restock_hub_enabled: true,
          delivery_mode: 'own',
          payment_mode: 'tenant_razorpay',
          commission_pct: DEFAULT_PLATFORM_FEE_PCT.toFixed(2),
          pass_fee_to_customer: true,
          upi_qr_image_url: null,
          settle_days: 1,
          listing_fee_monthly: '0.00',
          storefront_paid_until: null,
          mall_paid_until: null,
          addons_meta: {},
        }),
      );
    }
    return row;
  }

  /** Live only when paid period is active, or admin gifted the add-on. */
  mallIsLive(row: TenantCommerceSettings): boolean {
    if (!row.mall_enabled) return false;
    if (row.addons_meta?.admin_gifted_mall === true) return true;
    return row.mall_paid_until != null && new Date(row.mall_paid_until).getTime() > Date.now();
  }

  storefrontIsLive(row: TenantCommerceSettings): boolean {
    if (!row.storefront_enabled) return false;
    if (row.addons_meta?.admin_gifted_storefront === true) return true;
    return row.storefront_paid_until != null && new Date(row.storefront_paid_until).getTime() > Date.now();
  }

  serialize(row: TenantCommerceSettings) {
    const feePct = parseFloat(row.commission_pct);
    const commission = Number.isFinite(feePct) ? feePct : DEFAULT_PLATFORM_FEE_PCT;
    const example = customerChargeRupees(1000, {
      feePct: commission,
      passFeeToCustomer: row.pass_fee_to_customer !== false,
    });
    return {
      storefront_enabled: row.storefront_enabled,
      mall_enabled: row.mall_enabled,
      restock_hub_enabled: row.restock_hub_enabled,
      delivery_mode: row.delivery_mode,
      payment_mode: row.payment_mode,
      commission_pct: commission,
      pass_fee_to_customer: row.pass_fee_to_customer !== false,
      upi_qr_image_url: row.upi_qr_image_url ?? null,
      settle_days: row.settle_days ?? 1,
      listing_fee_monthly: parseFloat(row.listing_fee_monthly) || addonPriceRupees('mall_listing'),
      storefront_paid_until: row.storefront_paid_until?.toISOString() ?? null,
      mall_paid_until: row.mall_paid_until?.toISOString() ?? null,
      storefront_active: this.storefrontIsLive(row),
      mall_active: this.mallIsLive(row),
      admin_gifted_mall: row.addons_meta?.admin_gifted_mall === true,
      admin_gifted_storefront: row.addons_meta?.admin_gifted_storefront === true,
      addons: listAddonCatalog(),
      payment_modes: CUSTOMER_PAYMENT_MODES.map((id) => ({ id, ...PAYMENT_MODE_COPY[id] })),
      fee_example: {
        bill: 1000,
        customer_pays: example.charge,
        platform_fee: example.fee,
        shop_nets: example.netToShop,
      },
      updated_at: row.updated_at,
    };
  }

  async getSettings(ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    return this.serialize(await this.getOrCreate(ctx.tenantId));
  }

  async patchSettings(
    ctx: TenantContext,
    body: Partial<{
      storefront_enabled: boolean;
      mall_enabled: boolean;
      restock_hub_enabled: boolean;
      delivery_mode: string;
      payment_mode: string;
      pass_fee_to_customer: boolean;
      upi_qr_image_url: string | null;
    }>,
  ) {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    const can =
      ctx.isSuperAdmin ||
      ctx.permissions.includes('*') ||
      ctx.permissions.includes('org.company.update');
    if (!can) throw new ForbiddenException('Not allowed to update commerce settings');

    const row = await this.getOrCreate(ctx.tenantId);
    if (body.storefront_enabled != null) {
      const on = Boolean(body.storefront_enabled);
      if (on && !this.storefrontIsLive({ ...row, storefront_enabled: true })) {
        throw new BadRequestException(
          'Pay the Online shop add-on first (Online commerce → Pay add-ons), or ask SMEBUZE admin to gift it.',
        );
      }
      row.storefront_enabled = on;
    }
    if (body.mall_enabled != null) {
      const on = Boolean(body.mall_enabled);
      if (on && !this.mallIsLive({ ...row, mall_enabled: true })) {
        throw new BadRequestException(
          'Pay the Mall listing add-on first (Online commerce → Pay add-ons), or ask SMEBUZE admin to gift it.',
        );
      }
      row.mall_enabled = on;
      if (on) row.payment_mode = 'platform_collect';
    }
    if (body.restock_hub_enabled != null) row.restock_hub_enabled = Boolean(body.restock_hub_enabled);
    if (body.delivery_mode != null) {
      if (!DELIVERY_MODES.has(body.delivery_mode)) throw new BadRequestException('Invalid delivery_mode');
      row.delivery_mode = body.delivery_mode;
    }
    if (body.payment_mode != null) {
      if (!isCustomerPaymentMode(body.payment_mode) || !PAYMENT_MODES.has(body.payment_mode)) {
        throw new BadRequestException('Invalid payment_mode');
      }
      if (row.mall_enabled && body.payment_mode !== 'platform_collect') {
        throw new BadRequestException('Mall listing requires SMEBUZE collect (platform_collect)');
      }
      if (body.payment_mode === 'upi_qr' && !(body.upi_qr_image_url ?? row.upi_qr_image_url)) {
        throw new BadRequestException('Upload a UPI QR image before choosing QR mode.');
      }
      row.payment_mode = body.payment_mode;
    }
    if (body.pass_fee_to_customer != null) row.pass_fee_to_customer = Boolean(body.pass_fee_to_customer);
    if (body.upi_qr_image_url !== undefined) {
      const url = body.upi_qr_image_url == null ? null : String(body.upi_qr_image_url).trim() || null;
      row.upi_qr_image_url = url;
    }
    if (row.mall_enabled && row.payment_mode !== 'platform_collect') {
      row.payment_mode = 'platform_collect';
    }
    await this.settingsRepo.save(row);
    return this.serialize(row);
  }

  /** Platform admin can set commission / listing fee. */
  async adminPatchFees(
    ctx: TenantContext,
    tenantId: string,
    body: {
      commission_pct?: number;
      listing_fee_monthly?: number;
      mall_enabled?: boolean;
      pass_fee_to_customer?: boolean;
      settle_days?: number;
    },
  ) {
    if (!ctx.isSuperAdmin && !ctx.permissions.includes('admin.tenant.create') && !ctx.permissions.includes('*')) {
      throw new ForbiddenException('Platform admin only');
    }
    const row = await this.getOrCreate(tenantId);
    if (body.commission_pct != null) row.commission_pct = Math.max(0, body.commission_pct).toFixed(2);
    if (body.listing_fee_monthly != null) {
      row.listing_fee_monthly = Math.max(0, body.listing_fee_monthly).toFixed(2);
    }
    if (body.pass_fee_to_customer != null) row.pass_fee_to_customer = Boolean(body.pass_fee_to_customer);
    if (body.settle_days != null) row.settle_days = Math.max(0, Math.min(14, Math.round(body.settle_days)));
    if (body.mall_enabled != null) {
      row.mall_enabled = Boolean(body.mall_enabled);
      if (row.mall_enabled) {
        row.payment_mode = 'platform_collect';
        row.addons_meta = { ...(row.addons_meta || {}), admin_gifted_mall: true };
      }
    }
    await this.settingsRepo.save(row);
    return this.serialize(row);
  }
}
