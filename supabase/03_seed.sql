-- Windhaven Country Club — Seed data
-- Run AFTER 01_schema.sql and 02_rls.sql.
-- Idempotent: re-running upserts the same Windhaven club and refreshes content.

------------------------------------------------------------------------
-- 1. The club itself
------------------------------------------------------------------------
insert into clubs (id, name, slug, city, state, founded, par, yardage, lat, lng)
values (
  '00000000-0000-0000-0000-00000000c1b1',
  'Windhaven Country Club',
  'windhaven',
  'Windhaven',
  'CT',
  1924,
  72,
  6840,
  41.6032,   -- approximate CT lat/lng — replace with real coords when known
  -73.0877
)
on conflict (slug) do update
  set name = excluded.name,
      city = excluded.city,
      state = excluded.state,
      founded = excluded.founded,
      par = excluded.par,
      yardage = excluded.yardage,
      lat = excluded.lat,
      lng = excluded.lng;

------------------------------------------------------------------------
-- Helper: grab the club id once
------------------------------------------------------------------------
do $$
declare
  v_club uuid := '00000000-0000-0000-0000-00000000c1b1';
begin

  ----------------------------------------------------------------------
  -- 2. Club status pills (6 categories — match design exactly)
  ----------------------------------------------------------------------
  insert into club_status (club_id, category, label, sort_order, state, hours_note, staff_note) values
    (v_club, 'course',     'Course',     1, 'open',    '6:30am – Dusk',        'Cart path only on holes 3, 7 & 14 due to morning irrigation.'),
    (v_club, 'bar',        'Bar',        2, 'open',    '11:00am – 10:00pm',    'Happy hour 4–6pm. New Kentucky selections available — ask the bartender.'),
    (v_club, 'restaurant', 'Restaurant', 3, 'limited', 'Limited until 2:00pm', 'Private dining room reserved until 2pm. Main room open to members.'),
    (v_club, 'kitchen',    'Kitchen',    4, 'open',    '11:30am – 8:30pm',     null),
    (v_club, 'lounge',     'Lounge',     5, 'open',    'Open all day',         null),
    (v_club, 'oak',        'Oak Room',   6, 'closed',  'Closed today',         'Henderson party through 10pm. Reopens Sunday morning.')
  on conflict (club_id, category) do update
    set label = excluded.label,
        sort_order = excluded.sort_order,
        state = excluded.state,
        hours_note = excluded.hours_note,
        staff_note = excluded.staff_note,
        updated_at = now();

  ----------------------------------------------------------------------
  -- 3. Pace of play
  ----------------------------------------------------------------------
  insert into pace_of_play (club_id, state, time_label, message)
  values (v_club, 'open', '4h 08m', 'On pace')
  on conflict (club_id) do update
    set state = excluded.state,
        time_label = excluded.time_label,
        message = excluded.message,
        updated_at = now();

  ----------------------------------------------------------------------
  -- 4. News — wipe and reseed (small table, simple semantics)
  ----------------------------------------------------------------------
  delete from news where club_id = v_club;
  insert into news (club_id, category, headline, body, date_label, published_at) values
    (v_club, 'Events', 'Men''s Invitational — Pairings Posted',
     'The 54th Annual Men''s Invitational field is set. Tee times begin Saturday at 7:30am from the first tee. All participants please check in at the starter''s booth no later than 20 minutes prior to your tee time. Cart assignments and scorecards will be distributed at that time.',
     'Today', now()),
    (v_club, 'Course', 'Greens Aerification Complete',
     'Aerification of all 18 greens was completed this week ahead of schedule. Greens are healing well with favorable weather and should be putting true and fast by the weekend. Thank you for your patience. Please continue to repair ball marks and replace divots.',
     'May 14', now() - interval '1 day'),
    (v_club, 'Dining', 'Summer Menu Preview, Wednesday',
     'Join Executive Chef Marcus Webb for an exclusive member preview of the summer dining menu this Wednesday evening at 7pm. The evening will feature tastings from each course alongside wine pairings selected by our sommelier. Reservations required — space is limited to 24 guests.',
     'May 12', now() - interval '3 days'),
    (v_club, 'Course', 'New Cart Paths on Holes 3, 7 & 14',
     'Construction of the expanded cart paths on holes 3, 7, and 14 is now underway. Carts will be required to remain on path in these areas through June 1st. We appreciate your understanding as these improvements will significantly enhance the playing experience.',
     'May 10', now() - interval '5 days'),
    (v_club, 'Club', 'Board Meeting Summary — May Edition',
     'The Board of Governors met May 5th to review the spring capital plan, membership figures, and preparations for the summer social calendar. Full minutes are available at the member services desk and will be distributed by email this week.',
     'May 8', now() - interval '7 days'),
    (v_club, 'Events', 'Ladies'' Spring Social — Photos Posted',
     'Thank you to all who joined us for the Ladies'' Spring Social last Friday. Photos from the event are now available in the member gallery. Prints can be ordered through the club office.',
     'May 6', now() - interval '9 days');

  ----------------------------------------------------------------------
  -- 5. Events
  ----------------------------------------------------------------------
  delete from events where club_id = v_club;
  insert into events (club_id, title, description, category, event_date, event_time, date_label, dow, day_num, spots, price) values
    (v_club, '54th Men''s Invitational',  'The club''s signature men''s member event, now in its 54th year. 18-hole stroke play with flights by handicap. Lunch and awards reception to follow.',
     'Golf',   '2026-05-17', '7:30am shotgun',   'Sat, May 17', 'SAT', '17', 4,  '$125'),
    (v_club, 'Ladies'' Member-Guest',     'Invite a guest for a round, followed by luncheon and awards. Guest must be a member of a recognized golf club.',
     'Golf',   '2026-05-18', '9:00am tee times', 'Sun, May 18', 'SUN', '18', 8,  '$95'),
    (v_club, 'Summer Menu Preview',       'Chef Marcus Webb presents the summer menu. Four-course tasting with wine pairings. Hosted in the private dining room.',
     'Dining', '2026-05-21', '7:00pm – 9:30pm',  'Wed, May 21', 'WED', '21', 12, '$85'),
    (v_club, 'Wine & Cheese Social',      'Bimonthly member social on the terrace. Featuring selections from a Loire Valley producer, paired with an artisan cheese board.',
     'Social', '2026-05-23', '6:30pm – 9:00pm',  'Fri, May 23', 'FRI', '23', 22, '$65'),
    (v_club, 'Pro-Am Scramble',           'Four-person scramble format with a club professional in each group. Great format for all skill levels. Cart and range included.',
     'Golf',   '2026-05-24', '8:00am shotgun',   'Sat, May 24', 'SAT', '24', 6,  '$150'),
    (v_club, 'Memorial Day Cookout',      'Annual poolside Memorial Day cookout. All members and families welcome. No reservation required. Rain date: Tuesday, May 27.',
     'Social', '2026-05-26', '12:00pm – 4:00pm', 'Mon, May 26', 'MON', '26', 40, 'Free'),
    (v_club, 'Club Championship — Round 1','First round of the 2026 Club Championship. 36-hole stroke play over Saturday and Sunday. Gross and net divisions.',
     'Golf',   '2026-05-31', '7:00am – 2:00pm',  'Sat, May 31', 'SAT', '31', 0,  '$40'),
    (v_club, 'New Member Cocktail Hour',  'Welcome reception for members who joined in 2025–2026. Hosted by Club President and Board. Partners welcome.',
     'Social', '2026-06-06', '6:00pm – 8:00pm',  'Fri, Jun 6',  'FRI', '6',  15, 'Free');

  ----------------------------------------------------------------------
  -- 6. Menus
  ----------------------------------------------------------------------
  delete from menus where club_id = v_club;

  -- Specials
  insert into menus (club_id, category, sort_order, item_name, description, price, tag, is_special, available_today) values
    (v_club, 'specials', 1, 'Pan-Seared Diver Scallops',   'Sweet corn purée, chorizo vinaigrette, micro herbs — Chef''s feature today', '$42',  'Chef Special', true, true),
    (v_club, 'specials', 2, '1985 Château Margaux, 375ml', 'By the half-bottle from the reserve cellar — extremely limited',             '$180', 'Wine Special', true, true);

  -- Lunch
  insert into menus (club_id, category, sort_order, item_name, description, price) values
    (v_club, 'lunch', 1, 'Wedge Salad',               'Iceberg, bacon, gorgonzola, house ranch',                         '$16'),
    (v_club, 'lunch', 2, 'Lobster Bisque',            'Cream, sherry, chive oil, croutons',                              '$16'),
    (v_club, 'lunch', 3, 'Club Burger',               'Wagyu beef, aged cheddar, house-cured bacon, brioche bun',        '$24'),
    (v_club, 'lunch', 4, 'Grilled Swordfish',         'Citrus beurre blanc, summer vegetables, fingerling potato',       '$34'),
    (v_club, 'lunch', 5, 'Chilled Lobster Salad',     'Maine lobster, green goddess dressing, herb brioche',             '$38'),
    (v_club, 'lunch', 6, 'Heirloom Tomato & Burrata', 'Aged balsamic, basil oil, sea salt',                              '$18'),
    (v_club, 'lunch', 7, 'Croque Monsieur',           'Black Forest ham, Gruyère, Dijon béchamel, frisée',               '$18');

  -- Dinner
  insert into menus (club_id, category, sort_order, item_name, description, price) values
    (v_club, 'dinner', 1, 'Dry-Aged Ribeye, 16 oz',   'Truffle butter, roasted garlic, seasonal accompaniment',          '$68'),
    (v_club, 'dinner', 2, 'Pan-Seared Halibut',       'Brown butter emulsion, caper jus, grilled asparagus',             '$52'),
    (v_club, 'dinner', 3, 'Herb-Roasted Chicken',     'Natural jus, roasted root vegetables, sauce gribiche',            '$38'),
    (v_club, 'dinner', 4, 'Braised Short Rib',        'Red wine jus, celery root purée, horseradish gremolata',          '$48'),
    (v_club, 'dinner', 5, 'Maine Lobster Thermidor',  'Cognac cream sauce, gratin, drawn butter, haricots verts',        '$72'),
    (v_club, 'dinner', 6, 'Grilled Lamb Chops',       'Rosemary jus, white bean ragout, olive tapenade',                 '$58');

  -- Bar
  insert into menus (club_id, category, sort_order, item_name, description, price) values
    (v_club, 'bar', 1, 'Charcuterie Board',        'Cured meats, artisan cheeses, cornichons, whole grain mustard',     '$28'),
    (v_club, 'bar', 2, 'Oysters (6)',              'East Coast, shallot mignonette, cocktail sauce, lemon',             '$24'),
    (v_club, 'bar', 3, 'Truffle Fries',            'Parmesan, fresh herbs, truffle aioli',                              '$14'),
    (v_club, 'bar', 4, 'Windhaven Old Fashioned',  'Bourbon, house bitters, orange, Luxardo cherry',                    '$18'),
    (v_club, 'bar', 5, 'Classic Negroni',          'Gin, Campari, sweet vermouth, orange peel',                         '$17'),
    (v_club, 'bar', 6, 'Cucumber Gin & Tonic',     'House-infused gin, tonic, cucumber, herb garnish',                  '$16'),
    (v_club, 'bar', 7, 'House Wine, Glass',        'Red or white selection — ask your server',                          '$14');

  -- Desserts
  insert into menus (club_id, category, sort_order, item_name, description, price) values
    (v_club, 'desserts', 1, 'Crème Brûlée',         'Tahitian vanilla, seasonal berries',                                '$14'),
    (v_club, 'desserts', 2, 'Warm Chocolate Tart',  'Salted caramel, vanilla bean ice cream',                            '$16'),
    (v_club, 'desserts', 3, 'Seasonal Sorbet',      'Three scoops, house-made, ask your server for today''s flavors',    '$10'),
    (v_club, 'desserts', 4, 'Cheese Selection',     'Three artisan cheeses, fig jam, candied walnuts, crostini',         '$24');

  ----------------------------------------------------------------------
  -- 7. Pin placements (all 18 holes, today)
  ----------------------------------------------------------------------
  delete from pin_placements where club_id = v_club and effective_date = current_date;
  insert into pin_placements (club_id, hole_number, par, yards, pin_position, green_condition, hazard_note, pace_label, effective_date) values
    (v_club,  1, 4, 385, 'Right-center, 6 paces from front',  'Firm and fast — stimp 11',         'Left bunker in play, raked',         '4h 08m', current_date),
    (v_club,  2, 3, 162, 'Back-left, 3 paces from collar',    'Consistent speed',                 'Water right carries full hole',      '4h 08m', current_date),
    (v_club,  3, 4, 410, 'Front-right, 2 paces from edge',    'Softer near front',                'Cart path only — irrigation',        '4h 08m', current_date),
    (v_club,  4, 5, 520, 'Center, 12 paces from front',       'Moderate — stimp 10.5',            'Creek crosses fairway at 220',       '4h 08m', current_date),
    (v_club,  5, 4, 392, 'Left-center, 7 paces from front',   'Firm and fast — stimp 11',         'Two right bunkers, both raked',      '4h 08m', current_date),
    (v_club,  6, 3, 178, 'Right, 4 paces from collar',        'Good speed all areas',             'Water short and left',               '4h 08m', current_date),
    (v_club,  7, 4, 356, 'Back-center, 4 paces from collar',  'Firming up nicely',                'Cart path only — irrigation',        '4h 08m', current_date),
    (v_club,  8, 5, 540, 'Front-left, 3 paces from edge',     'Fast — approach with care',        'OB right the entire hole',           '4h 08m', current_date),
    (v_club,  9, 4, 428, 'Center, 9 paces from front',        'Uphill approach, allow extra',     'Bunker at 250 left',                 '4h 08m', current_date),
    (v_club, 10, 4, 398, 'Right-center, 5 paces from front',  'Back third very fast',             'Fairway bunkers at 220 L&R',         '4h 08m', current_date),
    (v_club, 11, 3, 190, 'Left, 6 paces from front',          'Consistent speed',                 'Deep bunker front-left',             '4h 08m', current_date),
    (v_club, 12, 5, 548, 'Back-right, 2 paces from collar',   'Slow near fringe, fast center',    'Creek at 280, bunker at green',      '4h 08m', current_date),
    (v_club, 13, 4, 375, 'Front-left, 4 paces from edge',     'Very receptive today',             'Trees tight on both sides',          '4h 08m', current_date),
    (v_club, 14, 3, 145, 'Center, 8 paces from front',        'Firm — stimp 11',                  'Cart path only — irrigation',        '4h 08m', current_date),
    (v_club, 15, 4, 420, 'Back-center, 3 paces from collar',  'Fast back to front',               'Water left from 200 in',             '4h 08m', current_date),
    (v_club, 16, 5, 515, 'Right-center, 10 paces from front', 'Moderate speed',                   'Double bunkers at green right',      '4h 08m', current_date),
    (v_club, 17, 3, 168, 'Left, 3 paces from collar',         'Very firm — stimp 11.5',           'Deep pot bunker front-left',         '4h 08m', current_date),
    (v_club, 18, 4, 445, 'Center, 5 paces from front',        'Home green, receptive',            'OB left, water right at 200',        '4h 08m', current_date);

  ----------------------------------------------------------------------
  -- 8. Onboarding / Member Guide
  ----------------------------------------------------------------------
  delete from club_content where club_id = v_club;
  insert into club_content (club_id, slug, title, icon, body, sort_order) values
    (v_club, 'welcome',      'Welcome to Windhaven',    '◈', 'We are delighted to welcome you as a member of Windhaven Country Club. Founded in 1924, Windhaven has served as the heart of its community for over a century. This guide covers everything you need to know to make the most of your membership.', 1),
    (v_club, 'course',       'The Course & Facilities', '⛳', 'Our 18-hole championship course plays to 6,840 yards from the tips. The course is open 365 days a year, weather permitting, from 6:30am to dusk. Tee times may be reserved up to 7 days in advance via this app, by phone, or at the pro shop.', 2),
    (v_club, 'dining',       'Dining',                  '◻', 'The restaurant is open for lunch and dinner daily. Reservations are recommended for dinner. Our bar and lounge welcome members throughout the day. Dress code applies in all dining areas — golf attire accepted until 5pm, collared shirts required at all times.', 3),
    (v_club, 'dress',        'Dress Code',              '◎', 'On course: collared shirt, tailored shorts or trousers, golf shoes. In the clubhouse: business casual after 5pm. Denim, athletic wear, and metal spikes are not permitted. Guests are expected to meet the same standard as members.', 4),
    (v_club, 'reservations', 'Reservations & Bookings', '◈', 'Tee times, dining reservations, and event registrations can all be made through this app. Same-day cancellations with less than 4 hours notice may incur a fee. Guest rounds require member accompaniment and must be booked through the pro shop.', 5),
    (v_club, 'events',       'Events & Traditions',     '◻', 'Windhaven hosts over 40 member events per year, including our signature Men''s and Ladies'' Invitationals, the Club Championship, monthly socials, and the annual Member-Member. The social calendar is posted here and in the monthly newsletter.', 6);

end $$;

------------------------------------------------------------------------
-- Note on members and bulletin/partner posts:
-- Those rows reference auth.users, which don't exist until you sign someone up.
-- We'll create the first member + admin in a later step once you have your
-- test account created via Supabase Authentication.
------------------------------------------------------------------------
