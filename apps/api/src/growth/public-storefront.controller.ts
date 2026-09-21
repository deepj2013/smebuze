import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public';
import { GrowthService } from './growth.service';
import { PublicLeadIngestDto, PublicOrderDto } from './dto/public-storefront.dto';

@Controller('public')
@Public()
export class PublicStorefrontController {
  constructor(private readonly growth: GrowthService) {}

  @Get('directory')
  directory() {
    return this.growth.publicDirectory();
  }

  @Get('resolve/:host')
  resolve(@Param('host') host: string) {
    return this.growth.resolvePublic(host).then(({ site, tenant }) => ({
      slug: site.slug,
      name: tenant.name,
      shop_enabled: site.shop_enabled,
      domain_status: site.domain_status,
    }));
  }

  @Get('shops/:slug')
  shop(@Param('slug') slug: string) {
    return this.growth.publicShop(slug);
  }

  @Get('sites/:slug')
  site(@Param('slug') slug: string) {
    return this.growth.publicSite(slug);
  }

  @Post('shops/:slug/orders')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  order(@Param('slug') slug: string, @Body() body: PublicOrderDto) {
    return this.growth.publicOrder(slug, body);
  }

  @Get('shops/:slug/orders/:token')
  track(@Param('slug') slug: string, @Param('token') token: string) {
    return this.growth.publicTrack(slug, token);
  }

  @Post('leads/ingest')
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  ingest(@Body() body: PublicLeadIngestDto) {
    return this.growth.ingestPublicLead(body);
  }
}
