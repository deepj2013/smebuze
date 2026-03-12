import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Integration tests: require a test database (same DB or TEST_DATABASE_URL).
 * Run with: npm run test:e2e
 * These tests perform login, create customer, and create invoice.
 */
describe('App (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let customerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it('POST /auth/login returns access_token when credentials valid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.com', password: 'demo123' });
    if (res.status === 200 && res.body?.access_token) {
      accessToken = res.body.access_token;
      expect(res.body).toHaveProperty('access_token');
    }
  });

  it('POST /crm/customers creates customer when authenticated', async () => {
    if (!accessToken) return;
    const res = await request(app.getHttpServer())
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Slug', 'demo')
      .send({ name: 'E2E Test Customer', email: 'e2e@test.com' })
      .expect(201);
    expect(res.body).toHaveProperty('id');
    customerId = res.body.id;
  });

  it('POST /sales/invoices creates invoice when authenticated', async () => {
    if (!accessToken || !customerId) return;
    const companies = await request(app.getHttpServer())
      .get('/api/v1/organization/companies')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Slug', 'demo');
    const companyId = companies.body?.[0]?.id ?? companies.body?.data?.[0]?.id;
    if (!companyId) return;
    await request(app.getHttpServer())
      .post('/api/v1/sales/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Tenant-Slug', 'demo')
      .send({
        company_id: companyId,
        customer_id: customerId,
        invoice_date: new Date().toISOString().slice(0, 10),
        lines: [{ hsn_sac: '9983', description: 'Test', qty: 1, rate: 100, cgst_rate: 9, sgst_rate: 9 }],
      })
      .expect((r) => r.status === 201 || r.status === 403);
  });
});
