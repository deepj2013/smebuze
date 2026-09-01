# Ice Crest — Staff training guide

Use this daily workflow in the Ice Crest CRM.

**Login:** workspace slug `ice-crest`, email `info@icecrest.in`. If you forget the password, use Forgot password — the code is sent to that mailbox from support@smebuze.com.

## 1. Stock inward (start of day / after production)

**Menu:** Stock Management → Stock inward / outward

1. Select movement type: **Stock inward** (or Opening stock on first setup).
2. Choose the ice SKU/size and warehouse.
3. Enter quantity produced or received and save.

## 2. Enquiries (website, WhatsApp, phone)

**Website:** Customers submit the form at `/ice-crest` — leads appear automatically.

**WhatsApp:** When Meta API is configured, inbound messages create leads tagged `whatsapp`.

**Menu:** CRM → Leads & enquiries

## 3. Quotation → Order → Invoice

See in-app guide at `/ice-crest/guide` for the full step-by-step with links.

## WhatsApp setup (admin)

Add to API `.env`:

```
WHATSAPP_ACCESS_TOKEN=your_meta_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=smebuzz_verify
WHATSAPP_DEFAULT_TENANT_SLUG=ice-crest
```

Webhook URL: `https://your-api-domain/api/v1/integrations/whatsapp/webhook`
