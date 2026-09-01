# Meta WhatsApp Cloud API — Ice Crest setup

Configure WhatsApp Business messaging for Ice Crest CRM (inbound leads + outbound campaigns/invoices).

## 1. Meta Business Manager

1. Go to [Meta for Developers](https://developers.facebook.com/) → **My Apps** → Create app → type **Business**.
2. Add product **WhatsApp** → **API Setup**.
3. Note these values:
   - **Phone number ID** (not the display phone number)
   - **WhatsApp Business Account ID** (optional, for templates)
   - **Temporary access token** (dev) or **System User permanent token** (production)

## 2. API environment variables

Copy to your API `.env`:

```env
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_VERIFY_TOKEN=ice_crest_webhook_2026
WHATSAPP_DEFAULT_TENANT_SLUG=ice-crest
API_PUBLIC_URL=https://api.yourdomain.com
WHATSAPP_API_VERSION=v21.0
WHATSAPP_DEFAULT_TEMPLATE=hello_world
WHATSAPP_TEMPLATE_LANG=en
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_AUTO_REPLY=Thanks for contacting Ice Crest! Our team will call you shortly.
```

Restart the API after changing `.env`.

## 3. Webhook registration

In **WhatsApp → Configuration → Webhook**:

| Field | Value |
|--------|--------|
| **Callback URL** | `https://YOUR_API_DOMAIN/api/v1/integrations/whatsapp/webhook` |
| **Verify token** | Same as `WHATSAPP_VERIFY_TOKEN` |

Subscribe to: `messages`

## 4. API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/integrations/whatsapp/webhook` | Meta verification |
| POST | `/api/v1/integrations/whatsapp/webhook` | Inbound → CRM lead |
| POST | `/api/v1/integrations/whatsapp/send` | Send message |
| GET | `/api/v1/integrations/whatsapp/status` | Config status |

## 5. In-app setup

Login as Ice Crest → **WhatsApp setup** at `/ice-crest/whatsapp`
