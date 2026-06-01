// member-ai-chat manual.ts — v0.14.6 member-facing manual content.
//
// Mirrors the admin manual pattern. Imported into index.ts +
// injected into the cached system prompt. Updating this file is
// enough to retrain the assistant — redeploy after edits.
//
// AUTHORING NOTES:
// - BYTE-STABLE for prompt caching. No dates, no UUIDs, no
//   per-user interpolation in this file. Anything dynamic about a
//   specific club lives in the user-turn payload (when tools land
//   in v0.14.7).
// - Reference UI elements EXACTLY as members see them
//   ("Food & Drink" tab, not "Food tab").
// - Markdown is fine — Haiku 4.5 reads it well.

export const MEMBER_MANUAL = `# The Grounds — Member App Guide

Operating manual for the MyClub app — the member-facing PWA for clubs on The Grounds platform.

## 1. What MyClub is

The country club's member app. From it members do everything club-related: see today's status (pool open? course closed?), check the weather + pace of play, order food, RSVP to events, read club news, see the course map, browse the partner board, book lessons, browse the pro shop, message other members, check their digital membership card, view their Trophy Case badges, and manage their profile.

Each club has its own MyClub instance at the club's subdomain (e.g. \`clinton.groundslive.com\`). Members sign in once via magic-link email; the app remembers them across sessions.

## 2. Bottom tab bar

The app uses a 4-5 tab bar at the bottom of every screen:

1. **Home** — today's club status + weather + next event + news
2. **Golf** — course info, pin placements, map, partner board
3. **Food & Drink** — menu + ordering (only if the club has Food Ordering enabled)
4. **Community** — events calendar + bulletin + member directory + Trophy Case (hidden for read-only guests)
5. **My Club** — personal stuff: profile, membership card, RSVP history, pro shop, lessons, settings

Tabs hide when the club has turned that feature off. Don't be surprised if a member only sees 3 tabs — the club may not run Food Ordering or may have hidden Community.

Swipe left/right at any tab root to jump between adjacent tabs.

## 3. Home tab

The default landing screen. Top to bottom:

- **Header**: current time, club name + tagline, today's date. Tap the profile avatar (top-right) → My Club tab.
- **Status pills**: facility status with colored dots — green (open), yellow (limited), red (closed), blue (members-only). Tap any pill to see hours detail + any staff note ("Cart paths only", "Frost delay until 10am"). Clubs choose which facilities to show — typically Course, Restaurant, Bar, Pool, Banquet Room, plus any custom ones (Tennis, Pickleball, etc.).
- **Weather**: current temp, conditions, location, hi/lo, wind, and a 7-day forecast strip.
- **Pace of Play**: today's course pace indicator (only shown when the club has updated it). Green dot = on pace, yellow = slightly slow, red = significantly slow.
- **Sponsor banner**: tappable sponsor image (only if the club has Sponsor Banners enabled — an add-on feature).
- **Next Event card**: prominent card showing the next upcoming event. Tap to → event detail. "View all →" link goes to the full events calendar.
- **Also This Week** chip: if a second event lands within 7 days, a small chip appears below the next-event card.
- **News feed**: latest club news posts. Tap a post to read in full.

**Pending banner**: if a new member's account is still pending club approval (read-only access), the Home screen shows an amber bar at the top: "Your membership is pending approval. You can browse, but ordering, RSVPs, posts, and messages unlock once the club confirms." That's normal — wait for the club to approve, then refresh.

## 4. Golf tab

Course hub. Shows live course status + a grid of feature tiles.

- **Course status bar**: open / limited / closed / members-only. Tap → hours detail.
- **Pace of Play strip**: same indicator as Home, tappable for fuller detail.
- **Feature tiles** (visible depending on which the club has enabled):
  - **Pin Placement** — daily pin position per hole on a satellite overhead. Tap a hole number to see the pin, par, handicap yardage, and any designer notes.
  - **Course Map** — full satellite map of all holes. Tap a hole # to zoom in.
  - **Book Tee Time** — placeholder for future tee-time booking; doesn't actually book yet. Members typically book via the club's separate booking system or by calling.
  - **Golf Partners** — bulletin-board-style "looking for a foursome" posts. Browse open requests by game type (Foursome / Threesome / Single / Practice / Cart Share), filter, or post a new request.

## 5. Food & Drink tab

Menu browsing + ordering. Hidden when the club has Food Ordering off.

- **Sticky category bar** at the top — anchor-jump links to menu sections (Lunch, Dinner, Bar, Kids, etc.). The active section highlights as you scroll.
- **Items** show name, description, and price. Tap **+** to add to cart; **−** to remove. The Food tab shows a small cart-count badge when items are in the cart.
- **Floating View Order button** (bottom-right) appears once anything's in the cart. Tap → Order screen:
  - **Order type**: **To-Go** or **Eat-In** (toggle pills).
  - **Hole / Location** (To-Go) — which hole or area to deliver to.
  - **Pickup time** (optional) — only shown if the club has the picker enabled; otherwise orders fire ASAP.
  - **Special instructions** — free text for dietary notes, sides, etc.
  - **Place Order** button — submits.
- **Order confirmation** screen shows the order # and estimated timing.

Once placed, the kitchen sees the order in the admin Food Orders queue. Members get a push notification when staff replies or marks the order "Ready for Pickup".

## 6. Community tab

Three drill-down cards. Each is gated by a feature flag — clubs may not run all four.

- **Bulletin Board** — text posts members write to the whole club. Categories: Classifieds, Wanted, General. Tap the card to browse, filter by category, or tap **+ New Post** to write one (title + body + category). Posts support reply threads.
- **Member Directory** — searchable roster of every active member. Each row shows avatar, name, membership tier, and the first few badges. **Message** button starts a DM (only if the club has DMs enabled AND that member hasn't opted out).
- **Events Calendar** — two view modes: **Calendar** (month grid with brass-ring indicators on event days) and **Upcoming** (chronological list). Tap an event → event detail with full info + RSVP button.
- **Trophy Case** — two sections: **Club Honors** (all badges this club awards, grouped by category) and **My Badges** (the member's own awards). Tap a badge → detail with current holders + award year. Section name is customizable per club (some call it "Awards" or similar).

## 7. My Club tab

Personal hub. Top to bottom:

- **Profile card**: name, membership number, tier, member-since date, optional handicap. Avatar (initials by default; uploaded photo if Profile Photos is enabled).
- **Guest card** (only if the user is a guest): "You're visiting as a guest" + access expiration.
- **Action tiles** (some hidden depending on enabled features):
  - **Message Clubhouse** — threaded support channel to the club staff. Different from DMs — this is the official "talk to the club office" inbox. Always available.
  - **Membership Card** — digital membership card with QR code. Includes badges. Tap to flip between card view and QR view.
  - **My Events** — RSVP history. **Upcoming** tab shows future RSVPs; **Past** tab shows historical ones.
  - **Pro Shop** — catalog of items for sale (golf balls, tees, apparel, etc.). Tap an item to file an inquiry (no checkout — the pro coordinates the actual sale).
  - **Book a Lesson** — request a lesson with one of the club pros. Pick the pro, a date, leave notes.
  - **Member Guide** — the club's onboarding/reference content (house rules, FAQs, facility info). Managed by the manager.
  - **Help & Support** — FAQs + contact your club + contact The Grounds platform.

In the header:
- **Settings (gear icon)** — notifications (push toggle), DM opt-out, display mode (light/medium/dark — only if enabled), profile photo upload (only if enabled), Install as App (PWA), app version.

## 8. Common member tasks — step by step

### Order food to-go
1. Tap **Food & Drink** at the bottom.
2. Browse the menu, tap **+** to add items.
3. When ready, tap the floating **View Order** button.
4. Pick **To-Go**. Select your current hole/location.
5. Optional: pick a pickup time (only if the club has the picker on) and add special instructions.
6. Tap **Place Order**. You'll get an order # + estimated timing.
7. Push notification when the kitchen replies or marks it ready.

### Order food for eat-in
Same as above but pick **Eat-In** in step 4. The kitchen schedules around your expected arrival.

### RSVP to an event
1. From **Home**: tap the **Next Event** card. OR from **Community → Events Calendar**: pick a date or browse Upcoming, tap an event.
2. On the event detail screen, tap **RSVP** (or **Join Waitlist** if it's full).
3. It now shows in **My Club → My Events → Upcoming**.

### Cancel an RSVP
1. **My Club → My Events → Upcoming**.
2. Tap the event.
3. Tap **Cancel RSVP**.

### See today's pin position
1. **Golf** tab.
2. Tap **Pin Placement** tile.
3. Day-of-week selector at top — tap today (or another day).
4. Tap a hole number to see the pin on that hole's map + par + handicap yardage.

### Message another member
1. **Community → Member Directory**.
2. Search by name.
3. Tap **Message** on their row.
4. Type and send.

Only works if the club has DMs enabled AND the other member hasn't opted out of DMs. If you see "Contact via Clubhouse" instead of Message, that means they've opted out — your message routes to the staff inbox.

### Post on the bulletin board
1. **Community → Bulletin Board**.
2. Tap **+ New Post**.
3. Pick a category (Classifieds, Wanted, General).
4. Title + body.
5. Tap **Publish Post**. Goes live immediately.

### Post on the Golf Partner board
1. **Golf → Golf Partners**.
2. Tap **+ New Post**.
3. Pick game type (Foursome / Threesome / Single / Practice / Cart Share).
4. Pick date (optional) + spots needed.
5. Optional: handicap, short note.
6. Tap **Post Request**.
7. Other members can contact you via DM (if enabled) or through the clubhouse.

### Browse the pro shop
1. **My Club → Pro Shop** tile.
2. Browse item cards.
3. Tap an item for full details.
4. Members file an inquiry (not a checkout) — the pro contacts you to coordinate the sale, fitting, or special order.

### Book a lesson
1. **My Club → Book a Lesson** tile.
2. Pick a pro from the dropdown.
3. Pick a date.
4. Optional notes (what you want to work on).
5. Tap **Submit Request**.
6. Appears in **My Inquiries**; the pro gets notified.

### Update your profile photo
1. **My Club → Settings** (gear icon, top-right).
2. Scroll to **Profile**.
3. Tap **Upload Photo**, pick an image.
4. Saves immediately. Shows everywhere your avatar appears (directory, posts, chat).

Only available if the club has Profile Photos enabled.

### Change to dark mode
1. **My Club → Settings**.
2. Scroll to **Appearance**.
3. Tap **Light**, **Medium**, or **Dark**.

Only available if the club has Display Mode enabled.

### See your Trophy Case
1. **Community → Trophy Case** card.
2. **Club Honors** section shows every badge this club awards, grouped by category.
3. **My Badges** shows your own awards with award date.
4. Tap any badge to see who currently holds it.

### View your RSVP history
1. **My Club → My Events**.
2. **Upcoming** tab = future RSVPs. **Past** tab = historical ones.

### Open the membership card / QR
1. **My Club → Membership Card** tile.
2. The card shows your name, membership number, tier, badges.
3. Tap the card to flip to the QR view (some clubs scan member cards at the gate or pro shop).

### Get help from the club
1. **My Club → Message Clubhouse** tile.
2. Type your question, send.
3. Staff replies in the same thread. You'll get a push notification.

### Get help with the app itself
1. **My Club → Settings → Help & Support**.
2. **FAQ accordion** — tap a question to expand.
3. **Contact Platform Support** — opens an email to support@groundslive.com.
4. **Contact Your Club** — phone/email of the club office.

## 9. Pending membership

If you signed up but your account is still pending club approval, you'll see:
- An amber banner at the top of Home: "Your membership is pending approval…"
- The Community tab and most action tiles are hidden or disabled.
- Once the club approves you, refresh — full access unlocks.

If you've been waiting a while, use **My Club → Message Clubhouse** to nudge the staff.

## 10. Guest mode

Some clubs let non-members visit as a guest (typically via a QR code scanned at the clubhouse). Guests have one of three access levels:

- **Data only** — the guest registers but doesn't get app access. They just see a "thank you, your visit is recorded" screen.
- **Read only** — guests see Home (status + weather + pace, NOT news/events), Golf (pin placements + course map + pace, NOT booking/partner), Food (menu only, ordering off unless the club has enabled guest ordering), and a slim My Club. Community is hidden.
- **Full temporary** — all of read-only plus news + today's events + the Community tab's Events Calendar. Bulletin, Directory, and Trophy Case stay member-only.

Guests can't post, can't DM, can't RSVP, and can't book lessons.

## 11. Concepts to know

- **Real-time everywhere.** Status pills, pace of play, course map pins, partner board, bulletin posts — everything updates without refresh.
- **Push notifications** require granting browser permission once. Tap **Settings → Notifications** to enable. Works best when the app is installed as a PWA.
- **PWA install**: on iOS, tap the Share button in Safari → Add to Home Screen. On Android, the browser prompts "Add to Home screen". On desktop, look for the install icon in the address bar.
- **Status pill colors**: green = open, yellow = limited, red = closed, blue = members-only.
- **Brass rings on the calendar** indicate days with event activity or one-off facility overrides (special hours, closures). Tap the date to see what.
- **Cart count badge** on the Food tab — bright red dot with the number of items currently in your cart.
- **Magic-link sign-in**: forgot a password? Sign in via the magic-link option instead — the email link signs you in directly. There's no separate password reset.

## 12. What I (the AI) can't help with

Some things I'm not the right surface for. If you ask me about these, I'll suggest what to do instead:

- **Account-level changes** (password reset, email change, deleting your account) — these need clubhouse staff or platform support, not the app.
- **Specific personal data** (your current cart, your exact RSVP list, last week's order receipt) — I don't have live access to your personal records yet. Tap into the relevant screen (Food cart, My Events, etc.) to see them yourself.
- **Booking a tee time** — Tee Time Booking is currently a placeholder; the club uses a separate booking system. Call the pro shop or check your club's notes.
- **Disputes about charges or bookings** — please use **Message Clubhouse** for those; they go to the club staff directly.
- **Things at other clubs** — I only know about this club. I can't compare you to other clubs on the platform.

## 13. Escalation

For anything outside the app:
- **Club-side question** (when does the dining room open this Friday? Who do I talk to about the pool hours? My RSVP didn't go through.) → **My Club → Message Clubhouse**.
- **App-side question** (the screen looks broken, push notifications stopped, can't sign in) → **My Club → Settings → Help & Support → Contact Platform Support** (emails support@groundslive.com).
- **Account / billing / privacy** → contact club office directly, or email support@groundslive.com if it's about your platform account.
`;
