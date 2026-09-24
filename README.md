# Creator Platform

A subscription-based creator platform: fans subscribe monthly to creators for
paywalled posts. Built with Next.js 14 (App Router), Prisma/PostgreSQL,
NextAuth, Paystack, and LiveKit.

## What's here

- **Auth** — email/password signup & login (NextAuth + bcrypt), separate
  Fan / Creator roles.
- **Creator profiles** — `/creator/[username]` public page with bio, price,
  and a post feed.
- **Subscriptions & payouts** — Paystack subaccounts for creators, Paystack Checkout for subscriptions, and an 80/20 creator/platform split.
  Platform subscriptions use Paystack recurring plans; creator subscriptions renew through a saved Paystack authorization with the same 80/20 split.
- **Paywall** — `/api/posts` only returns `mediaUrl` for posts the viewer is
  entitled to see (active subscriber, or the creator themself). Locked posts
  render a blurred/locked placeholder instead of the media — the gated URL is
  never sent to the client, so it can't be scraped from page source.
- **Creator dashboard** — connect payouts, publish posts, see subscriber count.

## Setup

1. **Install dependencies** (requires network access to npm):
   ```bash
   npm install
   ```
2. **Database** — spin up Postgres (e.g. `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`),
   copy `.env.example` to `.env` and fill in `DATABASE_URL`, then:
   ```bash
   npm run db:push
   ```
3. **Auth secret**:
   ```bash
   openssl rand -base64 32   # put the output in NEXTAUTH_SECRET
   ```
4. **Paystack**:
   - Add `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`, and `CRON_SECRET` to `.env`.
   - Configure the webhook URL as `https://YOUR-DOMAIN/api/paystack/webhook`.
   - Creator payout onboarding uses Paystack subaccounts.
5. **Run it**:
   ```bash
   npm run dev
   ```

## Media storage (Cloudinary)

The dashboard's "New post" form uploads photos/videos directly from the
browser to Cloudinary and stores the resulting URL — no server upload route
needed. Setup:

1. Create a free account at **cloudinary.com**.
2. On the dashboard home, copy your **Cloud Name** (top left).
3. Go to **Settings → Upload → Upload presets → Add upload preset**:
   - Set **Signing Mode** to **Unsigned**.
   - Save it, then copy its **preset name**.
4. In `.env`, set:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-preset-name"
   ```
5. Restart `npm run dev` if it was already running (env vars are only read
   on startup).

These are `NEXT_PUBLIC_` variables because the upload happens client-side —
this is intentional and safe for an *unsigned* preset, but it does mean
anyone could technically upload to your Cloudinary account through it.
Cloudinary lets you restrict an unsigned preset (folder, max file size,
allowed formats) under the preset's settings — worth doing before this goes
further than local testing.

For paywalled video specifically, consider Cloudinary's authenticated/signed
delivery URLs (or a dedicated video host like Mux) down the line — a plain
`secure_url` is a normal public link once someone has it, so it can be
shared outside the paywall after being unlocked once.

## Payments: an important practical constraint

This starter uses Paystack Checkout + subaccounts for
way to demonstrate subscriptions, payouts, and a platform fee. But **Paystack's
terms of service prohibit "sexually oriented" content and services** in most
regions, as do PayPal, Square, and most mainstream processors. This is a
business-model reality, not a coding one — it applies regardless of how the
app is built.

This is exactly why creator platforms often need marketplace payment providers for creator payouts —
it uses specialized "high-risk" processors (e.g. Vendo, CCBill, Segpay)
that are built for adult content and handle the associated compliance:
age verification (18+ ID checks for every creator and often every payment
method), 18 U.S.C. §2257 record-keeping if operating in/serving the US,
enhanced KYC/AML, and content moderation for consent and CSAM detection.
Integrating with one of those is a substantially different (and heavier)
integration than what's here — configure the Paystack API routes
routes for their SDK/API equivalents if you need that path.

If your platform is for non-adult paywalled content (fitness plans, art,
tutorials, music, fan communities, newsletters, etc.), the Paystack integration
here works as-is.

## Reels feed (`/feed`)

A TikTok/Instagram-Reels-style vertical scroll feed pulling posts from
**all** creators, newest first:

- `app/api/feed/route.ts` — paginated (`cursor`/`limit`) global feed,
  reusing the same paywall-gating logic as a single creator's page (locked
  posts never send `mediaUrl` to the client).
- `components/ReelsFeed.tsx` — scroll-snap container; each slide's video
  autoplays (muted, looped) only while it's the one in view, via
  `IntersectionObserver`, and pauses otherwise — that's what makes it feel
  like a reels feed instead of a stacked video list.
- `app/api/posts/[postId]/like/route.ts` — toggle a like; blocked on
  locked posts (a viewer can't like content they can't see).
- New `Like` model in the schema. After pulling this change, run
  `npm run db:push` again to apply it.

Not included yet: comments, sharing, a "for you vs following" split, or
view-count-based ranking — right now it's a strict reverse-chronological
feed across every creator.

## Live streaming + gifting (planned, not yet built)

Architecture for the next pass, so it's written down before we build it:

- **Video infrastructure**: LiveKit (or Agora) rather than self-hosting
  WebRTC — the server creates a "room" per live stream and issues the
  creator a publish token and viewers a subscribe token via their SDK.
  Free tier is enough for testing.
- **Virtual currency**: fans buy "coins" with a Paystack one-time
  payment (a top-up, separate from the subscription flow); coins are spent
  on gifts during a stream; creators' coin balances convert back to real
  payouts through the same Paystack subaccount already wired up for
  subscriptions.
- **New models needed**: `LiveStream` (creator, status, started/ended at,
  LiveKit room name), `Gift` (catalog: name, icon, coin cost), `GiftEvent`
  (who sent it, to which stream, how many coins).
- **Live chat + gift overlay**: LiveKit's data channel (or a lightweight
  WebSocket) for chat messages and gift events, rendered as an overlay on
  top of the video with an animation when a gift lands.
- This is a meaningfully bigger lift than the reels feed — new
  infrastructure account, a currency ledger that has to be airtight, and
  real-time chat — so it's worth building as its own focused pass rather
  than bolting onto an existing route.

## What's not included

- Direct messaging / tipping (you mentioned skipping this for now)
- Content moderation pipeline
- Age verification / KYC
- Email verification, password reset
- Rate limiting on public API routes
- Automated tests

## Project structure

```
app/
  api/
    auth/[...nextauth]/  NextAuth handler
    auth/register/       Sign-up endpoint
    paystack/onboard/    Creates creator subaccount + payout split
    paystack/webhook/   Keeps payments/subscriptions in sync
    paystack/recurring/ Renews creator subscriptions with saved authorization
    subscribe/           Creates Checkout session for a fan
    posts/               Create/list posts, paywall gating
  creator/[username]/    Public creator profile + feed
  dashboard/             Creator-only: connect payouts, publish posts
  login/, signup/
components/              SubscribeButton, PostCard
lib/                     prisma.ts, paystack.ts, auth.ts
prisma/schema.prisma     Data model
```

## Live streaming + gifting

This version adds a Live section, creator Go Live controls, LiveKit-powered video rooms, and FV Token gifts. Gifts use the server-side `PLATFORM_FEE_PERCENT` setting; it is set to **46%**, so creators receive **54% of the FV Token gift amount**. Admin gifts do not add to creator earnings.

### Required LiveKit setup
1. Create a LiveKit project (Cloud or your own server).
2. Add these variables to `.env`:
   - `NEXT_PUBLIC_LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
3. Keep `LIVEKIT_API_SECRET` server-side and never expose it in client code.
4. Run `npm install` and `npm run db:push`.

### Gifts
Creators must complete the existing Paystack payout onboarding before receiving gifts. Gift payments are created server-side as Paystack split payments, with the platform application fee calculated from `PLATFORM_FEE_PERCENT`.

FV Token gifts are ledger transfers inside the platform; Paystack is used when fans purchase the FV Tokens.

### Latest monetization updates
- Reels are completely free.
- Live viewing is unlocked by the ₦3,700/month FAN pass, an active subscription to the creator being watched, or ambassador access.
- Creator subscription prices are unchanged.
- Live gifts use a sticker-style categorized picker (Hot Picks, Make a Wish, Luxury) and are paid with FV Tokens.
- FV Token purchases use Paystack.
