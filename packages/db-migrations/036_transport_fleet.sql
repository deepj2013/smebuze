-- Transport / fleet (tenant-scoped). Safe for all tenants; only used when module enabled.

CREATE TABLE IF NOT EXISTS transport_vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  registration_no VARCHAR(40) NOT NULL,
  vehicle_type    VARCHAR(40) NOT NULL DEFAULT 'truck',
  make_model      VARCHAR(120),
  capacity_tons   DECIMAL(10,2),
  ownership       VARCHAR(20) NOT NULL DEFAULT 'owned',
  driver_name     VARCHAR(150),
  helper_name     VARCHAR(150),
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, registration_no)
);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_tenant ON transport_vehicles(tenant_id);

CREATE TABLE IF NOT EXISTS transport_vehicle_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES transport_vehicles(id) ON DELETE CASCADE,
  doc_type        VARCHAR(40) NOT NULL,
  document_number VARCHAR(80),
  issued_on       DATE,
  expires_on      DATE,
  remind_days     INT NOT NULL DEFAULT 30,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transport_docs_tenant ON transport_vehicle_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transport_docs_expiry ON transport_vehicle_documents(tenant_id, expires_on);

CREATE TABLE IF NOT EXISTS transport_trips (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES companies(id) ON DELETE SET NULL,
  vehicle_id        UUID REFERENCES transport_vehicles(id) ON DELETE SET NULL,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  driver_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  trip_date         DATE NOT NULL,
  lr_number         VARCHAR(60),
  from_place        VARCHAR(150) NOT NULL,
  to_place          VARCHAR(150) NOT NULL,
  party_name        VARCHAR(150),
  party_type        VARCHAR(20) NOT NULL DEFAULT 'company',
  fare_amount       DECIMAL(18,2) NOT NULL DEFAULT 0,
  diesel_amount     DECIMAL(18,2) NOT NULL DEFAULT 0,
  other_expense     DECIMAL(18,2) NOT NULL DEFAULT 0,
  advance_amount    DECIMAL(18,2) NOT NULL DEFAULT 0,
  distance_km       DECIMAL(10,2),
  status            VARCHAR(20) NOT NULL DEFAULT 'completed',
  bill_status       VARCHAR(20) NOT NULL DEFAULT 'unbilled',
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transport_trips_tenant ON transport_trips(tenant_id, trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_transport_trips_vehicle ON transport_trips(tenant_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_transport_trips_customer ON transport_trips(tenant_id, customer_id);
