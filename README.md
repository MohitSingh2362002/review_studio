# Do Nothing · Review Studio

Multi-client review QR workspace. Client records persist in D1 and are scoped to the authenticated agency user. Each random client ID has a customer review page at `/r/:id`.

## Use

1. Add a business name, niche, city and its Google review link. Alternatively upload the existing Google QR image to decode its destination locally.
2. Check the Google destination. Download the newly generated review-assistant QR PNG.
3. Import up to 200 businesses per CSV: `name,niche,city,url,services,keywords`. Maximum 500 per workspace. Quoted comma-separated or newline-separated service and keyword lists are supported. Each business supports up to 50 services/products and 50 unique keywords; duplicates are removed without regard to letter case. Imports accept files up to 3 MB.
4. Customers choose their own rating and describe their actual experience. They choose a listed service/product (or enter another), choose how it felt, and add their own details. They then choose from five suggestions, edit, copy, open Google and post themselves.
5. Editing a business preserves its QR destination. Pausing it disables its customer page.

## Current deployment limits

This deployment is public so customers can open `/r/:id` without signing in. The dashboard requires sign-in and each workspace sees only records owned by its authenticated user. The branded `/login` screen uses Sites-managed Sign in with ChatGPT; users use their own ChatGPT credentials. The application does not create shared passwords or store passwords. A new account starts with an empty workspace.

AI is optional and not active without a hosted `OPENAI_API_KEY` secret. With no key, five clearly labelled template suggestions preserve the customer’s text and add business context. AI responses must contain exactly five distinct, valid suggestions; invalid/provider-error responses fall back to labelled templates. `OPENAI_MODEL` defaults to `gpt-4.1-mini`. Never put the key in client code or a CSV. Configure secrets using the Sites environment facilities. Drafting sends the customer-provided text to OpenAI only when enabled; no review text is stored in D1. OpenAI processing remains subject to the provider's data policy.

The AI route enforces per-IP daily and per-client daily limits. Counters represent drafting requests, not reviews submitted. Google does not expose customer review creation through the Business Profile API. No automated posting, forced five stars, review gating, keyword stuffing, or claims of confirmed Google submissions.

## Development

Use the selected pnpm manager. `pnpm exec tsc --noEmit` validates types. `pnpm exec drizzle-kit generate` generates new schema migrations. Build using the Sites build helper and publish through the Sites workflow. Existing applied migrations are immutable. Local-only test data must not be included in migrations.

QR decoding uses jsQR; PNG generation uses qrcode; CSV parsing uses Papa Parse. A browser WebMCP directory filter is feature-detected; validation requires a supported browser and has not been performed in this runtime.

## Portal and Google connection

The portal follows the supplied Figma Admin / Dashboard · Premium Glass frame (15:95), adapted to Review Studio content: compact icon rail, floating header, translucent cards, charcoal/yellow accents and self-hosted Noto Sans. Original Figma assets are bundled locally in public/figma. The overview displays actual saved business and review data; activity charts show the last seven days of profile creation or loaded review timestamps, not live Google performance analytics. My profile saves the user's display name, agency and phone. Business profiles include description, address, city, phone, WhatsApp, website, image, reviews, services and up to 50 keywords. Uploaded PNG/JPEG/WebP images (up to 5 MB) persist in the R2 `BUCKET` binding. Images and active customer review pages are public; client management, account settings and Google tokens are owner-scoped.

Google setup is required before syncing:

1. Use a Google Cloud project approved for Business Profile APIs. Enable the Account Management, Business Information and Google My Business APIs needed by the account, location, media and review endpoints.
2. Configure the OAuth consent screen with the `https://www.googleapis.com/auth/business.manage` scope and appropriate test users or production verification.
3. Create a **Web application OAuth client**. Register this exact redirect URI: `https://do-nothing-review-studio.shivamm0003.chatgpt.site/api/google/callback`.
4. Set `GOOGLE_CLIENT_ID` and secret `GOOGLE_CLIENT_SECRET` in the site's runtime environment, then redeploy. `GOOGLE_TOKEN_ENCRYPTION_KEY` and `SITE_ORIGIN` were provisioned for this deployment. Never put real credentials in this source ZIP or browser code. Changing the encryption key requires every user to reconnect Google.
5. Open Google connection, authorize your Google account, choose an account and location, and import. Each workspace connects one Google account at a time; that account may manage many businesses. Additional Google accounts can be used by reconnecting. Sync requires the current connected Google account to manage the selected business.

OAuth uses PKCE, an expiring single-use state bound to the signed-in user and an HTTP-only cookie. Tokens are encrypted using AES-GCM with the owner ID as additional authenticated data. Disconnect removes tokens from this portal; users can separately revoke the app grant in Google Account settings.

Imports retrieve Google's available profile details, review link, a logo/cover image and the first 50 reviews, with pagination for additional reviews. WhatsApp is imported only when Google supplies the `url_whatsapp` attribute; missing details can be entered manually. Some service labels, images or fields may not be exposed by Google. Partial import failures appear as warnings. Sync preserves locally configured services, keywords and the existing QR ID. Portal edits do not write changes back to Google. Sync is user-triggered, not a scheduled background job.

## QR standees

The QR & standees view generates Classic white, Material blue and Modern split designs for the selected business. Download 1800 × 2700 PNG files, scalable SVG print artwork, or a QR-only PNG. Every QR encodes the business's existing review-assistant URL. Paused profiles remain paused. Customers confirm and post their own review on Google; generated text and ratings cannot be prefilled or submitted by this application.

## Source package

This ZIP contains the React/Vinext application, database migrations, static fonts and Sites deployment manifest. Runtime credentials, customer records, uploads and installed dependencies are excluded. It targets Sites/Cloudflare Workers with D1 (`DB`), R2 (`BUCKET`) and Sites-managed authentication; deploying to another provider requires equivalent storage and authentication adapters. Use Node 22.13+ and the pinned pnpm version in `package.json`. Install dependencies with the included install script and use the Sites build/publish workflow. Apply additive migrations in order and retain existing records.

Google OAuth and live API syncing require real account credentials and were not end-to-end tested in this environment. Browser interaction testing was unavailable. Type checking, build, migration preservation, profile mapping, encryption and QR payload checks cover the local implementation.

## Keyword handling

Keyword settings stay in the authenticated business manager. The server selects only phrases grounded in the customer’s chosen service, actual details and known business location. Unsupported superlatives and unrelated keywords are excluded. AI instructions permit at most two eligible keywords per suggestion, used naturally. The fifth fallback template can include an eligible service/location phrase. No keyword rankings or review outcomes are promised. Existing client records receive an empty keyword list through an additive migration; legacy updates preserve saved keywords.
