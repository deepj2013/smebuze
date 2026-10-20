-- Mall ecosystem: show listings from shops that deliver to the buyer's pincode.

ALTER TABLE tenant_commerce_settings
  ADD COLUMN IF NOT EXISTS mall_origin_pincode varchar(6) NULL,
  ADD COLUMN IF NOT EXISTS mall_coverage varchar(20) NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS mall_extra_pincodes jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tenant_commerce_settings.mall_origin_pincode IS 'Shop base pincode for mall delivery radius (falls back to default company address).';
COMMENT ON COLUMN tenant_commerce_settings.mall_coverage IS 'local | city | pincode_list | pan_india — who sees this shop on /mall.';
COMMENT ON COLUMN tenant_commerce_settings.mall_extra_pincodes IS 'Extra 6-digit pincodes when mall_coverage = pincode_list.';
