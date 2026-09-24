# Reels Feed Feature Setup

The project now includes the vertical `/feed` feed, video autoplay/pause behavior, and post likes.

After installing dependencies and configuring `.env.local`, run:

```bash
npm run db:push
npm run dev
```

`npm run db:push` is important because the feature adds the `Like` table and relations to Prisma.

The feed API is at `/api/feed` and the like API is at `/api/posts/[postId]/like`.


## Subscription platform fee
Creator subscription checkout uses `SUBSCRIPTION_PLATFORM_FEE_PERCENT`, defaulting to 20%. Paystack splits creator subscription payments 80% to the creator and 20% to the platform to the creator's connected account before Paystack/payment-provider fees. Live gifts keep their separate 46% platform fee via `PLATFORM_FEE_PERCENT`.


## Tip menu + interest preferences
- Creators can edit their live tip menu from the dashboard.
- New creator accounts receive four starter tip options (Kiss, Heart, Hot, VIP).
- Viewers see the active tip menu in live rooms and pay through the FV Token sticker gifts.
- Signup supports selecting multiple interests: Girls, Guys, and Trans. Preferences can be edited later from the dashboard.
- After updating the Prisma schema, run `npx prisma db push`.

## Moderation and safety controls

- Users can report accounts, posts, direct messages, and live rooms with a reason and supporting details.
- Admins have a moderation console for open/resolved/dismissed reports, users, posts, messages, and live rooms.
- Admins can ban or unban accounts, with optional temporary ban duration and a recorded reason.
- Banned accounts are rejected at login and existing authenticated sessions are checked against the ban state.
- Admins can remove reported posts/messages from the moderation console.
- Live rooms can be reported and surfaced to admins; this console does not itself record or automatically inspect the live video stream.

Run `npx prisma db push` after pulling these schema changes.

## Admin account investigation dashboard

The admin dashboard now supports opening any user into a full account investigation panel. It shows the user's profile and creator information, reports filed and received, posts, live-room history, direct-message history, subscriptions, purchases, gifts, interest preferences, and moderation history. Admins can ban/unban accounts, remove a user's posts or messages, and end an active live room from the investigation view.

A `ModerationAction` audit table records admin bans, unbans, report status changes, content removals, and live-room interventions with the admin, reason, timestamp, and relevant metadata.

Run `npx prisma db push` after updating the project so the new moderation audit table is created.


## Live viewing gate
- Viewers must have an active FAN platform subscription (or ambassador access) before a LiveKit room token is issued.
- The requirement is enforced server-side in `/api/live/token`; creators can still join their own live rooms.

## Paystack FV Token purchases

FV Token purchases now use Paystack instead of Paystack. Add these server environment variables:

```env
PAYSTACK_PUBLIC_KEY="pk_live_..."
PAYSTACK_SECRET_KEY="sk_live_..."
```

The Paystack webhook URL is:

`https://YOUR-DOMAIN/api/paystack/webhook`

Paystack checkout redirects through `/api/paystack/callback`, and the server verifies the transaction with Paystack before crediting FV Tokens. Never put the Paystack secret key in client-side code or commit it to source control.

## Latest live/reels/gifts changes
- Reels are completely free to watch; only posts marked as exclusive remain gated by the creator subscription.
- Live viewing requires either the ₦3,700/month FAN pass, an active subscription to that specific creator, or ambassador access.
- Existing creator subscription prices are unchanged.
- Live gifts now use a sticker-style picker with Hot Picks, Make a Wish, and Luxury categories. Creators can assign each gift to a category and choose an emoji/sticker icon plus FV Token price.
- FV Token purchases use Paystack; token purchases remain separate from the live gift wallet flow.
