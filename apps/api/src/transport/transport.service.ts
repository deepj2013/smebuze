import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { TransportVehicle } from './entities/transport-vehicle.entity';
import { VehicleDocument } from './entities/vehicle-document.entity';
import { TransportTrip } from './entities/transport-trip.entity';
import { Customer } from '../crm/entities/customer.entity';
import { Company } from '../tenant/entities/company.entity';
import { SalesService } from '../sales/sales.service';
import { TenantContext } from '../common/tenant-context';
import { PARTY_TYPES, VEHICLE_DOC_TYPES, VEHICLE_TYPES } from './transport-defaults';

function money(n: number) {
  return (Math.round((Number(n) + Number.EPSILON) * 100) / 100).toFixed(2);
}

@Injectable()
export class TransportService {
  constructor(
    @InjectRepository(TransportVehicle) private readonly vehicleRepo: Repository<TransportVehicle>,
    @InjectRepository(VehicleDocument) private readonly docRepo: Repository<VehicleDocument>,
    @InjectRepository(TransportTrip) private readonly tripRepo: Repository<TransportTrip>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    private readonly salesService: SalesService,
  ) {}

  private tenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    return ctx.tenantId;
  }

  meta() {
    return { doc_types: VEHICLE_DOC_TYPES, vehicle_types: VEHICLE_TYPES, party_types: PARTY_TYPES };
  }

  // ─── Vehicles ──────────────────────────────────────────────

  async listVehicles(ctx: TenantContext) {
    const tenantId = this.tenantId(ctx);
    return this.vehicleRepo.find({
      where: { tenant_id: tenantId },
      relations: ['documents'],
      order: { registration_no: 'ASC' },
    });
  }

  async getVehicle(ctx: TenantContext, id: string) {
    const tenantId = this.tenantId(ctx);
    const v = await this.vehicleRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['documents'],
    });
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  async createVehicle(
    ctx: TenantContext,
    dto: {
      company_id?: string;
      registration_no: string;
      vehicle_type?: string;
      make_model?: string;
      capacity_tons?: number;
      ownership?: string;
      driver_name?: string;
      helper_name?: string;
      status?: string;
      notes?: string;
      documents?: Array<{
        doc_type: string;
        document_number?: string;
        issued_on?: string;
        expires_on?: string;
        remind_days?: number;
        notes?: string;
      }>;
    },
  ) {
    const tenantId = this.tenantId(ctx);
    const reg = (dto.registration_no || '').trim().toUpperCase();
    if (!reg) throw new BadRequestException('Registration number is required');
    const clash = await this.vehicleRepo.findOne({ where: { tenant_id: tenantId, registration_no: reg } });
    if (clash) throw new BadRequestException('This vehicle number already exists in your fleet');

    const vehicle = await this.vehicleRepo.save(
      this.vehicleRepo.create({
        tenant_id: tenantId,
        company_id: dto.company_id || ctx.companyId || null,
        registration_no: reg,
        vehicle_type: dto.vehicle_type || 'truck',
        make_model: dto.make_model?.trim() || null,
        capacity_tons: dto.capacity_tons != null ? money(dto.capacity_tons) : null,
        ownership: dto.ownership || 'owned',
        driver_name: dto.driver_name?.trim() || null,
        helper_name: dto.helper_name?.trim() || null,
        status: dto.status || 'active',
        notes: dto.notes || null,
      }),
    );

    if (dto.documents?.length) {
      for (const d of dto.documents) {
        if (!d.doc_type) continue;
        await this.docRepo.save(
          this.docRepo.create({
            tenant_id: tenantId,
            vehicle_id: vehicle.id,
            doc_type: d.doc_type,
            document_number: d.document_number || null,
            issued_on: d.issued_on ? new Date(d.issued_on) : null,
            expires_on: d.expires_on ? new Date(d.expires_on) : null,
            remind_days: d.remind_days ?? 30,
            notes: d.notes || null,
          }),
        );
      }
    }
    return this.getVehicle(ctx, vehicle.id);
  }

  async updateVehicle(
    ctx: TenantContext,
    id: string,
    dto: Partial<{
      registration_no: string;
      vehicle_type: string;
      make_model: string;
      capacity_tons: number;
      ownership: string;
      driver_name: string;
      helper_name: string;
      status: string;
      notes: string;
    }>,
  ) {
    const tenantId = this.tenantId(ctx);
    const v = await this.vehicleRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!v) throw new NotFoundException('Vehicle not found');
    if (dto.registration_no !== undefined) {
      const reg = dto.registration_no.trim().toUpperCase();
      const clash = await this.vehicleRepo.findOne({ where: { tenant_id: tenantId, registration_no: reg } });
      if (clash && clash.id !== id) throw new BadRequestException('Registration number already used');
      v.registration_no = reg;
    }
    if (dto.vehicle_type !== undefined) v.vehicle_type = dto.vehicle_type;
    if (dto.make_model !== undefined) v.make_model = dto.make_model || null;
    if (dto.capacity_tons !== undefined) v.capacity_tons = dto.capacity_tons != null ? money(dto.capacity_tons) : null;
    if (dto.ownership !== undefined) v.ownership = dto.ownership;
    if (dto.driver_name !== undefined) v.driver_name = dto.driver_name || null;
    if (dto.helper_name !== undefined) v.helper_name = dto.helper_name || null;
    if (dto.status !== undefined) v.status = dto.status;
    if (dto.notes !== undefined) v.notes = dto.notes || null;
    await this.vehicleRepo.save(v);
    return this.getVehicle(ctx, id);
  }

  async upsertDocument(
    ctx: TenantContext,
    vehicleId: string,
    dto: {
      id?: string;
      doc_type: string;
      document_number?: string;
      issued_on?: string;
      expires_on?: string;
      remind_days?: number;
      notes?: string;
    },
  ) {
    const tenantId = this.tenantId(ctx);
    await this.getVehicle(ctx, vehicleId);
    if (!dto.doc_type) throw new BadRequestException('doc_type required');

    if (dto.id) {
      const row = await this.docRepo.findOne({ where: { id: dto.id, tenant_id: tenantId, vehicle_id: vehicleId } });
      if (!row) throw new NotFoundException('Document not found');
      row.doc_type = dto.doc_type;
      row.document_number = dto.document_number ?? row.document_number;
      row.issued_on = dto.issued_on ? new Date(dto.issued_on) : row.issued_on;
      row.expires_on = dto.expires_on ? new Date(dto.expires_on) : row.expires_on;
      row.remind_days = dto.remind_days ?? row.remind_days;
      row.notes = dto.notes ?? row.notes;
      await this.docRepo.save(row);
      return row;
    }

    return this.docRepo.save(
      this.docRepo.create({
        tenant_id: tenantId,
        vehicle_id: vehicleId,
        doc_type: dto.doc_type,
        document_number: dto.document_number || null,
        issued_on: dto.issued_on ? new Date(dto.issued_on) : null,
        expires_on: dto.expires_on ? new Date(dto.expires_on) : null,
        remind_days: dto.remind_days ?? 30,
        notes: dto.notes || null,
      }),
    );
  }

  async deleteDocument(ctx: TenantContext, vehicleId: string, docId: string) {
    const tenantId = this.tenantId(ctx);
    const row = await this.docRepo.findOne({ where: { id: docId, tenant_id: tenantId, vehicle_id: vehicleId } });
    if (!row) throw new NotFoundException('Document not found');
    await this.docRepo.remove(row);
    return { ok: true };
  }

  /** Documents expiring within `withinDays` (default 45), plus already expired. Tenant-only. */
  async renewals(ctx: TenantContext, withinDays = 45) {
    const tenantId = this.tenantId(ctx);
    const docs = await this.docRepo.find({
      where: { tenant_id: tenantId, expires_on: Not(IsNull()) },
      relations: ['vehicle'],
      order: { expires_on: 'ASC' },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + withinDays);

    return docs
      .filter((d) => d.expires_on && new Date(d.expires_on) <= horizon)
      .map((d) => {
        const exp = new Date(d.expires_on!);
        const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        const remind = d.remind_days ?? 30;
        let urgency: 'expired' | 'due_soon' | 'upcoming' = 'upcoming';
        if (daysLeft < 0) urgency = 'expired';
        else if (daysLeft <= remind) urgency = 'due_soon';
        return {
          id: d.id,
          vehicle_id: d.vehicle_id,
          registration_no: d.vehicle?.registration_no,
          doc_type: d.doc_type,
          document_number: d.document_number,
          expires_on: String(d.expires_on).slice(0, 10),
          days_left: daysLeft,
          remind_days: remind,
          urgency,
        };
      });
  }

  // ─── Trips ─────────────────────────────────────────────────

  async listTrips(ctx: TenantContext, q: { from?: string; to?: string; vehicle_id?: string; customer_id?: string }) {
    const tenantId = this.tenantId(ctx);
    const qb = this.tripRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.vehicle', 'v')
      .leftJoinAndSelect('t.customer', 'c')
      .leftJoinAndSelect('t.driver_employee', 'e')
      .where('t.tenant_id = :tenantId', { tenantId });
    if (q.from) qb.andWhere('t.trip_date >= :from', { from: q.from });
    if (q.to) qb.andWhere('t.trip_date <= :to', { to: q.to });
    if (q.vehicle_id) qb.andWhere('t.vehicle_id = :vehicleId', { vehicleId: q.vehicle_id });
    if (q.customer_id) qb.andWhere('t.customer_id = :customerId', { customerId: q.customer_id });
    return qb.orderBy('t.trip_date', 'DESC').addOrderBy('t.created_at', 'DESC').take(200).getMany();
  }

  async createTrip(
    ctx: TenantContext,
    dto: {
      company_id?: string;
      vehicle_id?: string;
      customer_id?: string;
      driver_employee_id?: string;
      trip_date: string;
      lr_number?: string;
      from_place: string;
      to_place: string;
      party_name?: string;
      party_type?: string;
      fare_amount?: number;
      diesel_amount?: number;
      other_expense?: number;
      advance_amount?: number;
      distance_km?: number;
      status?: string;
      notes?: string;
    },
  ) {
    const tenantId = this.tenantId(ctx);
    if (!dto.from_place?.trim() || !dto.to_place?.trim()) throw new BadRequestException('From and To places are required');
    if (!dto.trip_date) throw new BadRequestException('Trip date is required');
    if (dto.vehicle_id) await this.getVehicle(ctx, dto.vehicle_id);

    const fare = Number(dto.fare_amount || 0);
    const diesel = Number(dto.diesel_amount || 0);
    const other = Number(dto.other_expense || 0);

    return this.tripRepo.save(
      this.tripRepo.create({
        tenant_id: tenantId,
        company_id: dto.company_id || ctx.companyId || null,
        vehicle_id: dto.vehicle_id || null,
        customer_id: dto.customer_id || null,
        driver_employee_id: dto.driver_employee_id || null,
        trip_date: new Date(dto.trip_date),
        lr_number: dto.lr_number?.trim() || null,
        from_place: dto.from_place.trim(),
        to_place: dto.to_place.trim(),
        party_name: dto.party_name?.trim() || null,
        party_type: dto.party_type || 'company',
        fare_amount: money(fare),
        diesel_amount: money(diesel),
        other_expense: money(other),
        advance_amount: money(Number(dto.advance_amount || 0)),
        distance_km: dto.distance_km != null ? money(dto.distance_km) : null,
        status: dto.status || 'completed',
        bill_status: 'unbilled',
        notes: dto.notes || null,
        created_by: ctx.userId || null,
      }),
    );
  }

  async updateTrip(ctx: TenantContext, id: string, dto: Record<string, unknown>) {
    const tenantId = this.tenantId(ctx);
    const trip = await this.tripRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (dto.vehicle_id !== undefined) {
      if (dto.vehicle_id) await this.getVehicle(ctx, String(dto.vehicle_id));
      trip.vehicle_id = (dto.vehicle_id as string) || null;
    }
    if (dto.customer_id !== undefined) trip.customer_id = (dto.customer_id as string) || null;
    if (dto.driver_employee_id !== undefined) trip.driver_employee_id = (dto.driver_employee_id as string) || null;
    if (dto.trip_date) trip.trip_date = new Date(String(dto.trip_date));
    if (dto.lr_number !== undefined) trip.lr_number = String(dto.lr_number || '') || null;
    if (dto.from_place) trip.from_place = String(dto.from_place).trim();
    if (dto.to_place) trip.to_place = String(dto.to_place).trim();
    if (dto.party_name !== undefined) trip.party_name = String(dto.party_name || '') || null;
    if (dto.party_type) trip.party_type = String(dto.party_type);
    if (dto.fare_amount !== undefined) trip.fare_amount = money(Number(dto.fare_amount));
    if (dto.diesel_amount !== undefined) trip.diesel_amount = money(Number(dto.diesel_amount));
    if (dto.other_expense !== undefined) trip.other_expense = money(Number(dto.other_expense));
    if (dto.advance_amount !== undefined) trip.advance_amount = money(Number(dto.advance_amount));
    if (dto.distance_km !== undefined) trip.distance_km = dto.distance_km != null ? money(Number(dto.distance_km)) : null;
    if (dto.status) trip.status = String(dto.status);
    if (dto.bill_status) trip.bill_status = String(dto.bill_status);
    if (dto.notes !== undefined) trip.notes = String(dto.notes || '') || null;
    return this.tripRepo.save(trip);
  }

  /** Simple party / vehicle profit snapshot from trips (this tenant only). */
  async profitSummary(ctx: TenantContext, from?: string, to?: string) {
    const trips = await this.listTrips(ctx, { from, to });
    const byVehicle = new Map<string, { label: string; fare: number; diesel: number; other: number; trips: number }>();
    const byParty = new Map<string, { label: string; party_type: string; fare: number; diesel: number; other: number; trips: number }>();

    for (const t of trips) {
      const fare = Number(t.fare_amount);
      const diesel = Number(t.diesel_amount);
      const other = Number(t.other_expense);
      const vKey = t.vehicle_id || 'none';
      const vLabel = t.vehicle?.registration_no || 'No vehicle';
      const v = byVehicle.get(vKey) || { label: vLabel, fare: 0, diesel: 0, other: 0, trips: 0 };
      v.fare += fare;
      v.diesel += diesel;
      v.other += other;
      v.trips += 1;
      byVehicle.set(vKey, v);

      const pKey = t.customer_id || t.party_name || 'unknown';
      const pLabel = t.customer?.name || t.party_name || 'Unknown party';
      const p = byParty.get(pKey) || { label: pLabel, party_type: t.party_type, fare: 0, diesel: 0, other: 0, trips: 0 };
      p.fare += fare;
      p.diesel += diesel;
      p.other += other;
      p.trips += 1;
      byParty.set(pKey, p);
    }

    const mapRow = (r: { label: string; fare: number; diesel: number; other: number; trips: number; party_type?: string }) => ({
      ...r,
      profit: Math.round((r.fare - r.diesel - r.other) * 100) / 100,
    });

    return {
      vehicle_wise: [...byVehicle.values()].map(mapRow).sort((a, b) => b.profit - a.profit),
      party_wise: [...byParty.values()].map(mapRow).sort((a, b) => b.profit - a.profit),
    };
  }

  async getTrip(ctx: TenantContext, id: string) {
    const tenantId = this.tenantId(ctx);
    const trip = await this.tripRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['vehicle', 'customer', 'driver_employee'],
    });
    if (!trip) throw new NotFoundException('Trip not found');
    const companyId = trip.company_id || ctx.companyId;
    const company = companyId
      ? await this.companyRepo.findOne({ where: { id: companyId, tenant_id: tenantId } })
      : (await this.companyRepo.find({ where: { tenant_id: tenantId }, order: { is_default: 'DESC' }, take: 1 }))[0] ?? null;
    return { ...trip, company };
  }

  private async ensureCustomerForBilling(
    ctx: TenantContext,
    trip: TransportTrip,
    companyId: string,
  ): Promise<string> {
    const tenantId = this.tenantId(ctx);
    if (trip.customer_id) {
      const c = await this.customerRepo.findOne({ where: { id: trip.customer_id, tenant_id: tenantId } });
      if (c) return c.id;
    }
    const name = (trip.party_name || trip.customer?.name || '').trim();
    if (!name) throw new BadRequestException('Link a CRM party or enter party name before billing');
    const existing = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId AND lower(c.name) = lower(:name)', { tenantId, name })
      .getOne();
    if (existing) return existing.id;
    const created = await this.customerRepo.save(
      this.customerRepo.create({
        tenant_id: tenantId,
        company_id: companyId,
        name,
        entity_type: trip.party_type === 'individual' ? 'individual' : 'company',
        email: null,
        phone: null,
        gstin: null,
        address: {},
        credit_limit: '0.00',
        tags: ['transport'],
        contacts: [],
        segment: 'freight',
        is_active: true,
      }),
    );
    return created.id;
  }

  /**
   * Create one GST freight invoice for the given unbilled trips (same party).
   * Marks trips billed and stores invoice_id — tenant-scoped only.
   */
  async billTrips(
    ctx: TenantContext,
    dto: {
      trip_ids: string[];
      company_id?: string;
      invoice_date?: string;
      due_date?: string;
      gst_rate?: number; // CGST+SGST split; default 5% freight (2.5+2.5)
      number?: string;
    },
  ) {
    const tenantId = this.tenantId(ctx);
    const ids = [...new Set(dto.trip_ids || [])];
    if (!ids.length) throw new BadRequestException('Select at least one trip');

    const trips = await this.tripRepo.find({
      where: { tenant_id: tenantId, id: In(ids) },
      relations: ['vehicle', 'customer'],
      order: { trip_date: 'ASC' },
    });
    if (trips.length !== ids.length) throw new NotFoundException('One or more trips not found in this workspace');
    const already = trips.filter((t) => t.bill_status === 'billed' || t.invoice_id);
    if (already.length) throw new BadRequestException(`${already.length} trip(s) already billed`);

    const companyId =
      dto.company_id ||
      trips[0].company_id ||
      ctx.companyId ||
      (await this.companyRepo.find({ where: { tenant_id: tenantId }, order: { is_default: 'DESC' }, take: 1 }))[0]?.id;
    if (!companyId) throw new BadRequestException('Company required');

    // Group: all trips must resolve to same customer for one invoice
    const customerIds = await Promise.all(trips.map((t) => this.ensureCustomerForBilling(ctx, t, companyId)));
    const uniqueCustomers = [...new Set(customerIds)];
    if (uniqueCustomers.length > 1) {
      throw new BadRequestException('Selected trips belong to different parties. Bill one party at a time (monthly bill).');
    }
    const customerId = uniqueCustomers[0];

    // Persist customer_id on trips that only had party_name
    for (let i = 0; i < trips.length; i++) {
      if (!trips[i].customer_id) {
        trips[i].customer_id = customerId;
        await this.tripRepo.save(trips[i]);
      }
    }

    const gstTotal = dto.gst_rate ?? 5;
    const half = gstTotal / 2;
    const lines = trips.map((t) => {
      const vehicle = t.vehicle?.registration_no || '';
      const desc = `Freight ${t.from_place} → ${t.to_place}${vehicle ? ` (${vehicle})` : ''}${t.lr_number ? ` · LR ${t.lr_number}` : ''} · ${String(t.trip_date).slice(0, 10)}`;
      const advance = Number(t.advance_amount || 0);
      const fare = Number(t.fare_amount || 0);
      // Bill net fare; advance noted in description (full fare billed, advance settled as payment later)
      return {
        hsn_sac: '996511',
        description: advance > 0 ? `${desc} (advance ₹${advance.toFixed(2)} received)` : desc,
        qty: 1,
        unit: 'trip',
        rate: fare,
        cgst_rate: half,
        sgst_rate: half,
        igst_rate: 0,
      };
    });

    const invoice = await this.salesService.createInvoice(
      {
        company_id: companyId,
        customer_id: customerId,
        invoice_date: dto.invoice_date || new Date().toISOString().slice(0, 10),
        due_date: dto.due_date || undefined,
        number: dto.number,
        gst_applicable: true,
        lines,
      },
      ctx,
    );

    for (const t of trips) {
      t.bill_status = 'billed';
      t.invoice_id = invoice.id;
      await this.tripRepo.save(t);
    }

    const totalAdvance = trips.reduce((s, t) => s + Number(t.advance_amount || 0), 0);
    return {
      invoice: { id: invoice.id, number: invoice.number, total: invoice.total },
      trips_billed: trips.length,
      total_advance_noted: totalAdvance,
      invoice_path: `/sales/invoices/${invoice.id}`,
    };
  }

  /** Unbilled trips grouped by party for monthly billing UI. */
  async unbilledByParty(ctx: TenantContext, from?: string, to?: string) {
    const trips = await this.listTrips(ctx, { from, to });
    const unbilled = trips.filter((t) => t.bill_status !== 'billed' && !t.invoice_id);
    const groups = new Map<
      string,
      { key: string; label: string; party_type: string; customer_id: string | null; trip_ids: string[]; fare: number; count: number }
    >();
    for (const t of unbilled) {
      const key = t.customer_id || t.party_name || 'unknown';
      const label = t.customer?.name || t.party_name || 'Unknown party';
      const g = groups.get(key) || {
        key,
        label,
        party_type: t.party_type,
        customer_id: t.customer_id,
        trip_ids: [],
        fare: 0,
        count: 0,
      };
      g.trip_ids.push(t.id);
      g.fare += Number(t.fare_amount);
      g.count += 1;
      groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => b.fare - a.fare);
  }
}
