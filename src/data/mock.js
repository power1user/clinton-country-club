// Mock data — ported verbatim from tg-core.jsx so the prototype works
// end-to-end before Supabase is wired in. Replace with hooks/queries
// when the backend is connected.

export const DATA_STATUS = [
  { id:'course',     label:'Course',     st:'open',    hrs:'6:30am – Dusk',        note:'Cart path only on holes 3, 7 & 14 due to morning irrigation.' },
  { id:'bar',        label:'Bar',        st:'open',    hrs:'11:00am – 10:00pm',    note:'Happy hour 4–6pm. New Kentucky selections available — ask the bartender.' },
  { id:'restaurant', label:'Restaurant', st:'limited', hrs:'Limited until 2:00pm', note:'Private dining room reserved until 2pm. Main room open to members.' },
  { id:'kitchen',    label:'Kitchen',    st:'open',    hrs:'11:30am – 8:30pm',     note:'' },
  { id:'lounge',     label:'Lounge',     st:'open',    hrs:'Open all day',         note:'' },
  { id:'oak',        label:'Oak Room',   st:'closed',  hrs:'Closed today',         note:'Henderson party through 10pm. Reopens Sunday morning.' },
];

export const DATA_WEATHER = { temp:72, high:76, low:58, condition:'Partly Cloudy', wind:'8 mph E', uv:4, humidity:54 };

export const DATA_NEWS = [
  { id:1, date:'Today',  cat:'Events', head:"Men's Invitational — Pairings Posted", body:"The 54th Annual Men's Invitational field is set. Tee times begin Saturday at 7:30am from the first tee. All participants please check in at the starter's booth no later than 20 minutes prior to your tee time. Cart assignments and scorecards will be distributed at that time." },
  { id:2, date:'May 14', cat:'Course', head:'Greens Aerification Complete',          body:"Aerification of all 18 greens was completed this week ahead of schedule. Greens are healing well with favorable weather and should be putting true and fast by the weekend. Thank you for your patience. Please continue to repair ball marks and replace divots." },
  { id:3, date:'May 12', cat:'Dining', head:'Summer Menu Preview, Wednesday',        body:"Join Executive Chef Marcus Webb for an exclusive member preview of the summer dining menu this Wednesday evening at 7pm. The evening will feature tastings from each course alongside wine pairings selected by our sommelier. Reservations required — space is limited to 24 guests." },
  { id:4, date:'May 10', cat:'Course', head:'New Cart Paths on Holes 3, 7 & 14',     body:"Construction of the expanded cart paths on holes 3, 7, and 14 is now underway. Carts will be required to remain on path in these areas through June 1st. We appreciate your understanding as these improvements will significantly enhance the playing experience." },
  { id:5, date:'May 8',  cat:'Club',   head:'Board Meeting Summary — May Edition',   body:"The Board of Governors met May 5th to review the spring capital plan, membership figures, and preparations for the summer social calendar. Full minutes are available at the member services desk and will be distributed by email this week." },
  { id:6, date:'May 6',  cat:'Events', head:"Ladies' Spring Social — Photos Posted", body:"Thank you to all who joined us for the Ladies' Spring Social last Friday. Photos from the event are now available in the member gallery. Prints can be ordered through the club office." },
];

export const DATA_EVENTS = [
  { id:1, date:'Sat, May 17', dow:'SAT', day:'17', title:"54th Men's Invitational",    time:'7:30am shotgun',    cat:'Golf',   spots:4,  price:'$125', desc:"The club's signature men's member event, now in its 54th year. 18-hole stroke play with flights by handicap. Lunch and awards reception to follow." },
  { id:2, date:'Sun, May 18', dow:'SUN', day:'18', title:"Ladies' Member-Guest",         time:'9:00am tee times',  cat:'Golf',   spots:8,  price:'$95',  desc:"Invite a guest for a round, followed by luncheon and awards. Guest must be a member of a recognized golf club." },
  { id:3, date:'Wed, May 21', dow:'WED', day:'21', title:'Summer Menu Preview',           time:'7:00pm – 9:30pm',   cat:'Dining', spots:12, price:'$85',  desc:"Chef Marcus Webb presents the summer menu. Four-course tasting with wine pairings. Hosted in the private dining room." },
  { id:4, date:'Fri, May 23', dow:'FRI', day:'23', title:'Wine & Cheese Social',          time:'6:30pm – 9:00pm',   cat:'Social', spots:22, price:'$65',  desc:"Bimonthly member social on the terrace. Featuring selections from a Loire Valley producer, paired with an artisan cheese board." },
  { id:5, date:'Sat, May 24', dow:'SAT', day:'24', title:'Pro-Am Scramble',               time:'8:00am shotgun',    cat:'Golf',   spots:6,  price:'$150', desc:"Four-person scramble format with a club professional in each group. Great format for all skill levels. Cart and range included." },
  { id:6, date:'Mon, May 26', dow:'MON', day:'26', title:"Memorial Day Cookout",          time:'12:00pm – 4:00pm',  cat:'Social', spots:40, price:'Free', desc:"Annual poolside Memorial Day cookout. All members and families welcome. No reservation required. Rain date: Tuesday, May 27." },
  { id:7, date:'Sat, May 31', dow:'SAT', day:'31', title:"Club Championship — Round 1",   time:'7:00am – 2:00pm',   cat:'Golf',   spots:0,  price:'$40',  desc:"First round of the 2026 Club Championship. 36-hole stroke play over Saturday and Sunday. Gross and net divisions." },
  { id:8, date:'Fri, Jun 6',  dow:'FRI', day:'6',  title:'New Member Cocktail Hour',      time:'6:00pm – 8:00pm',   cat:'Social', spots:15, price:'Free', desc:"Welcome reception for members who joined in 2025–2026. Hosted by Club President and Board. Partners welcome." },
];

export const DATA_MENU = {
  specials: [
    { id:'s1', name:'Pan-Seared Diver Scallops', desc:"Sweet corn purée, chorizo vinaigrette, micro herbs — Chef's feature today", price:'$42', tag:'Chef Special' },
    { id:'s2', name:'1985 Château Margaux, 375ml', desc:'By the half-bottle from the reserve cellar — extremely limited', price:'$180', tag:'Wine Special' },
  ],
  lunch: [
    { id:'l1', name:'Wedge Salad',              desc:'Iceberg, bacon, gorgonzola, house ranch',                       price:'$16' },
    { id:'l2', name:'Lobster Bisque',           desc:'Cream, sherry, chive oil, croutons',                            price:'$16' },
    { id:'l3', name:'Club Burger',              desc:'Wagyu beef, aged cheddar, house-cured bacon, brioche bun',      price:'$24' },
    { id:'l4', name:'Grilled Swordfish',        desc:'Citrus beurre blanc, summer vegetables, fingerling potato',     price:'$34' },
    { id:'l5', name:'Chilled Lobster Salad',    desc:'Maine lobster, green goddess dressing, herb brioche',           price:'$38' },
    { id:'l6', name:'Heirloom Tomato & Burrata',desc:'Aged balsamic, basil oil, sea salt',                            price:'$18' },
    { id:'l7', name:'Croque Monsieur',          desc:'Black Forest ham, Gruyère, Dijon béchamel, frisée',             price:'$18' },
  ],
  dinner: [
    { id:'d1', name:'Dry-Aged Ribeye, 16 oz',   desc:'Truffle butter, roasted garlic, seasonal accompaniment',        price:'$68' },
    { id:'d2', name:'Pan-Seared Halibut',       desc:'Brown butter emulsion, caper jus, grilled asparagus',           price:'$52' },
    { id:'d3', name:'Herb-Roasted Chicken',     desc:'Natural jus, roasted root vegetables, sauce gribiche',          price:'$38' },
    { id:'d4', name:'Braised Short Rib',        desc:'Red wine jus, celery root purée, horseradish gremolata',        price:'$48' },
    { id:'d5', name:'Maine Lobster Thermidor',  desc:'Cognac cream sauce, gratin, drawn butter, haricots verts',      price:'$72' },
    { id:'d6', name:'Grilled Lamb Chops',       desc:'Rosemary jus, white bean ragout, olive tapenade',               price:'$58' },
  ],
  bar: [
    { id:'b1', name:'Charcuterie Board',        desc:'Cured meats, artisan cheeses, cornichons, whole grain mustard', price:'$28' },
    { id:'b2', name:'Oysters (6)',              desc:'East Coast, shallot mignonette, cocktail sauce, lemon',         price:'$24' },
    { id:'b3', name:'Truffle Fries',            desc:'Parmesan, fresh herbs, truffle aioli',                          price:'$14' },
    { id:'b4', name:'Clinton Old Fashioned',    desc:'Bourbon, house bitters, orange, Luxardo cherry',                price:'$18' },
    { id:'b5', name:'Classic Negroni',          desc:'Gin, Campari, sweet vermouth, orange peel',                     price:'$17' },
    { id:'b6', name:'Cucumber Gin & Tonic',     desc:'House-infused gin, tonic, cucumber, herb garnish',              price:'$16' },
    { id:'b7', name:'House Wine, Glass',        desc:'Red or white selection — ask your server',                      price:'$14' },
  ],
  desserts: [
    { id:'ds1', name:'Crème Brûlée',            desc:'Tahitian vanilla, seasonal berries',                            price:'$14' },
    { id:'ds2', name:'Warm Chocolate Tart',     desc:'Salted caramel, vanilla bean ice cream',                        price:'$16' },
    { id:'ds3', name:'Seasonal Sorbet',         desc:"Three scoops, house-made, ask your server for today's flavors", price:'$10' },
    { id:'ds4', name:'Cheese Selection',        desc:'Three artisan cheeses, fig jam, candied walnuts, crostini',     price:'$24' },
  ],
};

export const DATA_HOLES = [
  { n:1,  par:4, yds:385, pin:'Right-center, 6 paces from front', grn:'Firm and fast — stimp 11', haz:'Left bunker in play, raked',   pace:'4h 08m' },
  { n:2,  par:3, yds:162, pin:'Back-left, 3 paces from collar',   grn:'Consistent speed',         haz:'Water right carries full hole',pace:'4h 08m' },
  { n:3,  par:4, yds:410, pin:'Front-right, 2 paces from edge',   grn:'Softer near front',        haz:'Cart path only — irrigation',  pace:'4h 08m' },
  { n:4,  par:5, yds:520, pin:'Center, 12 paces from front',      grn:'Moderate — stimp 10.5',    haz:'Creek crosses fairway at 220', pace:'4h 08m' },
  { n:5,  par:4, yds:392, pin:'Left-center, 7 paces from front',  grn:'Firm and fast — stimp 11', haz:'Two right bunkers, both raked',pace:'4h 08m' },
  { n:6,  par:3, yds:178, pin:'Right, 4 paces from collar',       grn:'Good speed all areas',     haz:'Water short and left',         pace:'4h 08m' },
  { n:7,  par:4, yds:356, pin:'Back-center, 4 paces from collar', grn:'Firming up nicely',        haz:'Cart path only — irrigation',  pace:'4h 08m' },
  { n:8,  par:5, yds:540, pin:'Front-left, 3 paces from edge',    grn:'Fast — approach with care',haz:'OB right the entire hole',     pace:'4h 08m' },
  { n:9,  par:4, yds:428, pin:'Center, 9 paces from front',       grn:'Uphill approach, allow extra', haz:'Bunker at 250 left',       pace:'4h 08m' },
  { n:10, par:4, yds:398, pin:'Right-center, 5 paces from front', grn:'Back third very fast',     haz:'Fairway bunkers at 220 L&R',   pace:'4h 08m' },
  { n:11, par:3, yds:190, pin:'Left, 6 paces from front',         grn:'Consistent speed',         haz:'Deep bunker front-left',       pace:'4h 08m' },
  { n:12, par:5, yds:548, pin:'Back-right, 2 paces from collar',  grn:'Slow near fringe, fast center', haz:'Creek at 280, bunker at green', pace:'4h 08m' },
  { n:13, par:4, yds:375, pin:'Front-left, 4 paces from edge',    grn:'Very receptive today',     haz:'Trees tight on both sides',    pace:'4h 08m' },
  { n:14, par:3, yds:145, pin:'Center, 8 paces from front',       grn:'Firm — stimp 11',          haz:'Cart path only — irrigation',  pace:'4h 08m' },
  { n:15, par:4, yds:420, pin:'Back-center, 3 paces from collar', grn:'Fast back to front',       haz:'Water left from 200 in',       pace:'4h 08m' },
  { n:16, par:5, yds:515, pin:'Right-center, 10 paces from front',grn:'Moderate speed',           haz:'Double bunkers at green right',pace:'4h 08m' },
  { n:17, par:3, yds:168, pin:'Left, 3 paces from collar',        grn:'Very firm — stimp 11.5',   haz:'Deep pot bunker front-left',   pace:'4h 08m' },
  { n:18, par:4, yds:445, pin:'Center, 5 paces from front',       grn:'Home green, receptive',    haz:'OB left, water right at 200',  pace:'4h 08m' },
];

export const DATA_PARTNERS = [
  { id:1, author:'R. Stanton',    hcp:12, date:'Today',  title:'Looking for 3 — Saturday 8am',     body:'Need two or three for Saturday morning round. Prefer 10–15 hcp. Cart share welcome. Playing 18. Reply here or call the pro shop.', cat:'Foursome',   open:true  },
  { id:2, author:'E. Whitfield',  hcp:8,  date:'Today',  title:'1 spot open, Wednesday 7am',        body:'Threesome with one cancellation. Wednesday 7:00am off #1. 15 hcp or below preferred. Motorized cart only.',                       cat:'Single',     open:true  },
  { id:3, author:'D. Mercer',     hcp:18, date:'May 14', title:'Sunday afternoon — any takers?',    body:'Looking for 2-3 players for Sunday around 1pm. Casual round, no pressure on score. All handicaps welcome.',                     cat:'Threesome',  open:true  },
  { id:4, author:'P. Groves',     hcp:5,  date:'May 14', title:'Club Championship practice round',  body:'Planning a practice round Thursday evening before the Championship. Looking for 1-2 serious players. Scratch to 8 hcp.',         cat:'Practice',   open:true  },
  { id:5, author:'W. Harrington', hcp:14, date:'May 13', title:'Cart share this weekend',           body:'Available Saturday or Sunday for a cart share. I have a morning reservation — happy to add a partner to split costs.',           cat:'Cart Share', open:false },
];

export const DATA_BULLETIN = [
  { id:1, cat:'Classifieds', author:'W. Harrington', date:'May 14', title:'TaylorMade Stealth Driver — $180',       body:'Barely used, 10.5° loft, Fujikura 5S shaft. Purchased last fall. Excellent condition. Pick up at club or I can bring to the course.' },
  { id:2, cat:'Classifieds', author:'P. Groves',     date:'May 13', title:'Golf cart, 2022 EZGO TXT — $4,200',      body:'48V electric, full canopy, recent battery service, charger included. Member sale only. Located in cart barn.' },
  { id:3, cat:'Wanted',      author:'D. Mercer',     date:'May 13', title:'Looking for junior iron set',            body:"Son is 14, 5'7\". Looking for right-handed junior set in good condition. Any brand considered. Willing to pay fair market value." },
  { id:4, cat:'General',     author:'E. Whitfield',  date:'May 12', title:'Lost: 7-iron near hole 12 green',        body:'Left my TaylorMade P770 7-iron near the 12th green Monday afternoon. If found please leave at the bag drop or contact the pro shop.' },
  { id:5, cat:'Classifieds', author:'R. Stanton',    date:'May 11', title:'Titleist Pro V1 dozen lots — $38/dozen', body:'Bought too many. Several unused dozens, Pro V1 current model. First come first served. Text me or reply here.' },
  { id:6, cat:'General',     author:'M. Reynolds',   date:'May 10', title:'Reminder: Annual dues due June 1',       body:'A reminder from member services that annual dues invoices are due June 1st. Statements have been mailed. Contact the office with questions.' },
];

export const DATA_PROSHOP = [
  { id:1, name:'FootJoy Pro SL Shoes',       desc:'White/navy, all widths available, sizes 8–13', was:'$180', now:'$129', tag:'30% off' },
  { id:2, name:'Titleist SM10 Wedge Set',    desc:'54° and 58° SM10, matte black, stock shafts',  was:'$280', now:'$220', tag:'Demo sale' },
  { id:3, name:'Clinton Member Polo',        desc:'Merino blend, forest green, S–XXL available',  was:'$85',  now:'$65',  tag:'Members only' },
  { id:4, name:'Sunday Bag — Clinton Logo',  desc:'Lightweight carry bag, green/tan colorway',    was:'$160', now:'$120', tag:'Limited qty' },
  { id:5, name:'Callaway Chrome Soft (dozen)',desc:'Current model, yellow or white',              was:'$55',  now:'$44',  tag:'20% off' },
];

export const DATA_MEMBER = {
  name: 'William T. Harrington', number: '4271', type: 'Full Member',
  since: '1998', hcp: '14.2', email: 'w.harrington@email.com',
  locker: '118', cart: 'Motorized (assigned)', parking: 'Lot A, Space 14',
};

export const ONBOARDING = [
  { id:'welcome',      title:'Welcome to Windhaven',    icon:'◈', body:'We are delighted to welcome you as a member of Windhaven Country Club. Founded in 1924, Windhaven has served as the heart of its community for over a century. This guide covers everything you need to know to make the most of your membership.' },
  { id:'course',       title:'The Course & Facilities', icon:'⛳', body:'Our 18-hole championship course plays to 6,840 yards from the tips. The course is open 365 days a year, weather permitting, from 6:30am to dusk. Tee times may be reserved up to 7 days in advance via this app, by phone, or at the pro shop.' },
  { id:'dining',       title:'Dining',                  icon:'◻', body:'The restaurant is open for lunch and dinner daily. Reservations are recommended for dinner. Our bar and lounge welcome members throughout the day. Dress code applies in all dining areas — golf attire accepted until 5pm, collared shirts required at all times.' },
  { id:'dress',        title:'Dress Code',              icon:'◎', body:'On course: collared shirt, tailored shorts or trousers, golf shoes. In the clubhouse: business casual after 5pm. Denim, athletic wear, and metal spikes are not permitted. Guests are expected to meet the same standard as members.' },
  { id:'reservations', title:'Reservations & Bookings', icon:'◈', body:'Tee times, dining reservations, and event registrations can all be made through this app. Same-day cancellations with less than 4 hours notice may incur a fee. Guest rounds require member accompaniment and must be booked through the pro shop.' },
  { id:'events',       title:'Events & Traditions',     icon:'◻', body:"Windhaven hosts over 40 member events per year, including our signature Men's and Ladies' Invitationals, the Club Championship, monthly socials, and the annual Member-Member. The social calendar is posted here and in the monthly newsletter." },
];
