import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TransportService } from './transport.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/tenant-context';

@Controller('transport')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TransportController {
  constructor(private readonly transport: TransportService) {}

  @Get('meta')
  meta() {
    return this.transport.meta();
  }

  @Get('renewals')
  renewals(@Query('within_days') withinDays: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.transport.renewals(ctx, withinDays ? Number(withinDays) : 45);
  }

  @Get('profit')
  profit(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.transport.profitSummary(ctx, from, to);
  }

  @Get('unbilled')
  unbilled(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.transport.unbilledByParty(ctx, from, to);
  }

  @Post('bill')
  bill(@Body() body: { trip_ids: string[]; company_id?: string; invoice_date?: string; due_date?: string; gst_rate?: number; number?: string }, @CurrentTenant() ctx: TenantContext) {
    return this.transport.billTrips(ctx, body);
  }

  @Get('trips/:id')
  getTrip(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.transport.getTrip(ctx, id);
  }

  @Get('vehicles')
  listVehicles(@CurrentTenant() ctx: TenantContext) {
    return this.transport.listVehicles(ctx);
  }

  @Get('vehicles/:id')
  getVehicle(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.transport.getVehicle(ctx, id);
  }

  @Post('vehicles')
  createVehicle(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.transport.createVehicle(ctx, body as Parameters<TransportService['createVehicle']>[1]);
  }

  @Patch('vehicles/:id')
  updateVehicle(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.transport.updateVehicle(ctx, id, body as Parameters<TransportService['updateVehicle']>[2]);
  }

  @Post('vehicles/:id/documents')
  upsertDoc(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.transport.upsertDocument(ctx, id, body as Parameters<TransportService['upsertDocument']>[2]);
  }

  @Delete('vehicles/:vehicleId/documents/:docId')
  deleteDoc(
    @Param('vehicleId') vehicleId: string,
    @Param('docId') docId: string,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.transport.deleteDocument(ctx, vehicleId, docId);
  }

  @Get('trips')
  listTrips(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('vehicle_id') vehicleId: string | undefined,
    @Query('customer_id') customerId: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.transport.listTrips(ctx, { from, to, vehicle_id: vehicleId, customer_id: customerId });
  }

  @Post('trips')
  createTrip(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.transport.createTrip(ctx, body as Parameters<TransportService['createTrip']>[1]);
  }

  @Patch('trips/:id')
  updateTrip(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.transport.updateTrip(ctx, id, body);
  }
}
