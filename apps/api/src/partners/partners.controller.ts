import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../common/tenant-context';
import type { TenantContext } from '../common/tenant-context';
import { PartnersService } from './partners.service';
import {
  CreateBdeLeadDto,
  CreateBdeUserDto,
  CreatePartnerDto,
  UpdateBdeLeadDto,
  UpdateCommissionStatusDto,
  UpdatePartnerDto,
} from './dto/partners.dto';

@Controller('api/v1')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get('partners/me')
  partnerMe(@CurrentTenant() ctx: TenantContext) {
    return this.partners.partnerDashboard(ctx);
  }

  @Get('partners/commissions')
  listCommissions(@CurrentTenant() ctx: TenantContext, @Query('partnerId') partnerId?: string) {
    return this.partners.listCommissions(ctx, partnerId);
  }

  @Patch('partners/commissions/:id')
  updateCommission(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateCommissionStatusDto,
  ) {
    return this.partners.updateCommissionStatus(ctx, id, dto);
  }

  @Get('partners')
  listPartners(@CurrentTenant() ctx: TenantContext) {
    return this.partners.listPartners(ctx);
  }

  @Post('partners')
  createPartner(@CurrentTenant() ctx: TenantContext, @Body() dto: CreatePartnerDto) {
    return this.partners.createPartner(ctx, dto);
  }

  @Patch('partners/:id')
  updatePartner(@CurrentTenant() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.partners.updatePartner(ctx, id, dto);
  }

  @Get('bde/users')
  listBdeUsers(@CurrentTenant() ctx: TenantContext) {
    return this.partners.listBdeUsers(ctx);
  }

  @Post('bde/users')
  createBdeUser(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateBdeUserDto) {
    return this.partners.createBdeUser(ctx, dto);
  }

  @Get('bde/leads')
  listLeads(@CurrentTenant() ctx: TenantContext) {
    return this.partners.listLeads(ctx);
  }

  @Post('bde/leads')
  createLead(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateBdeLeadDto) {
    return this.partners.createLead(ctx, dto);
  }

  @Patch('bde/leads/:id')
  updateLead(@CurrentTenant() ctx: TenantContext, @Param('id') id: string, @Body() dto: UpdateBdeLeadDto) {
    return this.partners.updateLead(ctx, id, dto);
  }
}
