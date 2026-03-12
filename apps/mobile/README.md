# SMEBUZE Mobile (Flutter)

Minimal Flutter app that uses the **same REST API** as the web app. Login (email, password, tenant slug) and dashboard are implemented; add more screens (Vendors, Invoices, etc.) by calling endpoints from `docs/API_FOR_MOBILE.md`.

## Prerequisites

- Flutter SDK 3.0+
- API running (e.g. `npm run api:dev` from repo root)

If `android/` and `ios/` are missing, run `flutter create .` in `apps/mobile` once to generate platform folders, then `flutter run`.

## Configure API URL

Edit `lib/services/api_service.dart` and set `baseUrl` to your API base (e.g. `http://10.0.2.2:3000` for Android emulator, or your machine IP for a real device).

## Run

```bash
cd apps/mobile
flutter pub get
flutter run
```

## Demo login

- **Tenant user:** Email `admin@demo.com`, Password `Password123`, Tenant slug `demo`
- **Super-admin:** Email `superadmin@smebuzz.com`, Password `Password123`, Tenant slug empty

## Phase 11

This starter includes login (email, password, tenant slug), home/dashboard, customers list, and invoices list (see docs/TODO.md). Extend with more screens using the same API as the web app (docs/API_FOR_MOBILE.md).
