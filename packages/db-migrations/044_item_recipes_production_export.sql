-- Recipe (BOM) for finished goods + production runs. Safe for sweets shops and manufacturing.
-- Ice Crest keeps its own production plan; this is the shared inventory path.

CREATE TABLE IF NOT EXISTS item_recipe_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  finished_item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  component_item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_per_unit numeric(18, 4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT item_recipe_lines_qty_positive CHECK (qty_per_unit > 0),
  CONSTRAINT item_recipe_lines_not_self CHECK (finished_item_id <> component_item_id),
  CONSTRAINT item_recipe_lines_unique UNIQUE (tenant_id, finished_item_id, component_item_id)
);

CREATE INDEX IF NOT EXISTS idx_item_recipe_lines_finished ON item_recipe_lines (tenant_id, finished_item_id);
CREATE INDEX IF NOT EXISTS idx_item_recipe_lines_component ON item_recipe_lines (tenant_id, component_item_id);

CREATE TABLE IF NOT EXISTS production_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  finished_item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_produced numeric(18, 4) NOT NULL,
  unit_cost numeric(18, 4) NOT NULL DEFAULT 0,
  total_cost numeric(18, 4) NOT NULL DEFAULT 0,
  produced_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_runs_qty_positive CHECK (qty_produced > 0)
);

CREATE INDEX IF NOT EXISTS idx_production_runs_tenant_date ON production_runs (tenant_id, produced_at DESC);

CREATE TABLE IF NOT EXISTS production_run_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  component_item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_used numeric(18, 4) NOT NULL,
  unit_cost numeric(18, 4) NOT NULL DEFAULT 0,
  line_cost numeric(18, 4) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_production_run_lines_run ON production_run_lines (run_id);
