// Food, drink, sound names and funny lines.

// style: what the NEXT fart sounds like after eating this.
//   dry = brassy, wet = soggy, squeak = high little squeaks, sbd = silent but deadly
// fart / burp: gas added (0-100 scale). shart: shart-meter change. stench: how bad the cloud is.
// burpStink: garlic-style stink burp strength (0 = clean burp).
export const FOODS = [
  { id: 'beans',   emoji: '🫘', name: 'Baked beans',     fart: 38, burp: 0,  style: 'dry',    stench: 1.0, shart: 5,   note: 'Big brassy farts' },
  { id: 'chili',   emoji: '🌶️', name: 'Chili pepper',    fart: 30, burp: 5,  style: 'wet',    stench: 1.3, shart: 14,  note: 'Hot and wet. Shart risk!' },
  { id: 'broc',    emoji: '🥦', name: 'Broccoli',        fart: 22, burp: 0,  style: 'dry',    stench: 1.7, shart: 3,   note: 'Toxic stench' },
  { id: 'egg',     emoji: '🥚', name: 'Boiled egg',      fart: 22, burp: 5,  style: 'sbd',    stench: 2.3, shart: 4,   note: 'Silent but deadly' },
  { id: 'cheese',  emoji: '🧀', name: 'Old cheese',      fart: 16, burp: 0,  style: 'squeak', stench: 1.6, shart: 5,   note: 'Squeaky and stinky' },
  { id: 'garlic',  emoji: '🧄', name: 'Garlic',          fart: 6,  burp: 20, style: 'dry',    stench: 1.2, shart: 2,   burpStink: 1.8, note: 'Stink burps' },
  { id: 'onion',   emoji: '🧅', name: 'Raw onion',       fart: 12, burp: 15, style: 'dry',    stench: 1.3, shart: 3,   burpStink: 1.3, note: 'Stink burps' },
  { id: 'pizza',   emoji: '🍕', name: 'Pizza slice',     fart: 16, burp: 12, style: 'dry',    stench: 0.9, shart: 5,   note: 'A bit of everything' },
  { id: 'kebab',   emoji: '🥙', name: 'Kebab',           fart: 26, burp: 8,  style: 'wet',    stench: 1.2, shart: 11,  note: 'Soggy. Shart risk!' },
  { id: 'burrito', emoji: '🌯', name: 'Burrito',         fart: 34, burp: 5,  style: 'wet',    stench: 1.3, shart: 13,  note: 'Extreme soggy. Shart risk!' },
  { id: 'hotdog',  emoji: '🌭', name: 'Hot dog',         fart: 16, burp: 6,  style: 'dry',    stench: 1.0, shart: 6,   note: 'Honest farts' },
  { id: 'peach',   emoji: '🍑', name: 'Dodgy peach',     fart: 14, burp: 0,  style: 'wet',    stench: 0.9, shart: 20,  note: 'Very risky!' },
  { id: 'gelato',  emoji: '🍦', name: 'Gelato',          fart: 12, burp: 6,  style: 'squeak', stench: 0.8, shart: 9,   note: 'Squeakers' },
  { id: 'salad',   emoji: '🥗', name: 'Salad',           fart: 8,  burp: 0,  style: 'squeak', stench: 0.5, shart: -12, note: 'Little missers. Calms the belly' },
  { id: 'banana',  emoji: '🍌', name: 'Banana',          fart: 5,  burp: 0,  style: 'dry',    stench: 0.6, shart: -18, note: 'Plugs the hole. Safe!' },
  // drinks
  { id: 'cola',    emoji: '🥤', name: 'Cola',            fart: 4,  burp: 38, drink: true, shart: 2,  note: 'Massive burps' },
  { id: 'beer',    emoji: '🍺', name: 'Beer',            fart: 12, burp: 30, drink: true, shart: 5,  style: 'wet', stench: 1.1, note: 'Big burps, beer farts' },
  { id: 'prosecco',emoji: '🍾', name: 'Prosecco',        fart: 0,  burp: 28, drink: true, shart: 1,  note: 'Classy burps' },
  { id: 'milk',    emoji: '🥛', name: 'Milk',            fart: 20, burp: 10, drink: true, shart: 17, style: 'wet', stench: 1.4, note: 'Lactose! Shart risk!' },
  { id: 'espresso',emoji: '☕', name: 'Triple espresso', fart: 6,  burp: 8,  drink: true, shart: 22, note: 'Gets things moving...' },
];
// Spawn weights: risky items a bit rarer, drinks common enough for burps.
export const FOOD_WEIGHT = { beans: 3, chili: 2, broc: 2, egg: 2, cheese: 2, garlic: 2, onion: 2, pizza: 3, kebab: 2, burrito: 2,
  hotdog: 3, peach: 1, gelato: 2, salad: 2, banana: 2, cola: 3, beer: 3, prosecco: 2, milk: 1.5, espresso: 1.5 };

export const FART_NAMES = {
  dry:    ['Little Misser', 'Toot', 'Trumpet', 'Thunderclap', 'EARTHQUAKE'],
  wet:    ['Squelchlet', 'Soggy Toot', 'Swamp Rumble', 'Mud Slide', 'EXTREME SOGGY'],
  squeak: ['Mouse Squeak', 'Squeaky Door', 'Balloon Squeal', 'Kazoo Solo', 'OPERA SQUEAK'],
  sbd:    ['Sneaky Whisper', 'Ninja Puff', 'Silent Killer', 'Chemical Weapon', 'BIOHAZARD'],
};
export const BURP_NAMES = ['Hiccup', 'Burplet', 'Belch', 'Foghorn', 'VOLCANO'];

export const LINES = {
  fan: ['BRAVO!', 'MAGNIFICO!', 'Legend!', '10/10!', 'Respect, bro!', 'Encore!', 'Now THAT is art!', 'Bellissimo!', 'Absolute unit!', 'Mamma mia, what a tone!', 'Do it again!', 'Grazie maestro!', 'Is that a tuba?!', 'Pure Pavarotti!', 'My grandfather wept.', 'I just got goosebumps.', 'Frame it!', 'Better than the opera!', 'Tell your mamma I said bravo!', 'Standing ovation!', 'That had a chorus!', 'Is he OK? Who cares, BRAVO!', 'That one had a key change!', 'Sir, that was a masterpiece.', 'I am naming my son after that one.', 'Play it again at my wedding!'],
  fanBurp: ['What a belch!', 'Rattled my teeth!', 'BRAVO!', 'Pure bass!', 'Champion!', 'Burp of the year!', 'The windows shook!', 'Did the fountain just ripple?', 'Somebody give him a microphone!', 'I felt it in my wallet!', 'That burp paid rent!'],
  meh: ['Dude...', 'Really?!', 'Grow up.', 'Not cool, man.', 'Seriously?', 'Classy.', '*sigh*', 'Wow. Just wow.', 'My lawyer will hear about this.', 'I was eating a sandwich...', 'Was that a duck?', 'Unbelievable.', 'I need a new nose.', 'Not in front of the kids!', 'This is a family piazza!', 'I paid for this view.', 'Is this an art installation?', 'My dog does that. My dog is ashamed.', 'I am calling my cousin. He is a lawyer.'],
  curse: ['#@$%&!', '%&@#!!', 'BUTT PIG!', 'PIG!', 'MY HAIR!!', '@#$%!!', 'Che schifo!', 'Animal!', '$#@!% you!', 'Disgusting!', 'I just had it DONE!', 'My perm! My PERM!', 'Three hours at the salon!', 'I look like a broom!', 'You exhaust pipe!', 'Flatulent walrus!', '#@$! gas bag!', 'My hairspray is melting!', 'My blow-dry cost fifty euro!', 'I look like a startled cat!'],
  flee: ['EWWW!', 'Mamma mia!', 'My eyes!', 'What died?!', 'GAS! GAS! GAS!', 'I can taste it!', 'Run!', 'Oh no no no', '*gag*', 'Who did that?!', 'It burns!', 'My eyebrows are gone!', 'The pigeons are fleeing too!', 'Call the priest!', 'It follows me!', 'Tastes like cabbage!', 'Nooo, my gelato!', 'It is in my clothes!', 'I see colours!', 'Mamma, the smell!', 'Hold your breath!', 'I can hear it AND smell it!', 'Save the children! And my shoes!', 'My nose hair just fell out!', 'It is following my Wi-Fi!', 'Not the linen! NOT THE LINEN!'],
  empty: ['...nothing.', '*pfft*... nope.', 'Tank empty!', 'Need food!'],
  eat: ['Mmm!', 'Nom nom', 'Delizioso!', '*gulp*', 'More!', 'Yum!'],
  shart: ['Uh oh.', 'Oh no.', '...that was not air.'],
  hero: ['Scusi!', 'Better out than in!', 'Pardon my Italian.', 'Bellissimo.', 'Still got it.', 'That one was for you, mamma!', 'Ahhh...', 'Excuse me!', 'Grazie, grazie.', 'A classic.', 'Vintage.', 'Sorry, not sorry.', 'You are welcome.', 'Nature called. I answered.'],
  strain: ['Nnnngh!', 'Careful Gino...', 'Hnnngh!'],
  blast: ['WHOA!', 'MY FACE!', 'I felt that!', 'It went in my mouth!', 'My ears are ringing!', 'I heard it in my teeth!', 'Warm... it was WARM!', 'My shirt moved!', 'Point-blank!'],
  womanMeh: ['Butt pig.', 'Ugh. Pig.', 'Disgusting.', 'Men...', 'Seriously?!', 'Animal.', 'Absolutely vile.', 'Not on a Sunday!', 'My husband does that too.', 'Tell your mother!', 'Some people...', 'My ex did that. That is why he is my ex.', 'I just ate lunch!', 'Mother warned me about men like you.'],
  chat: ['Blah blah blah...', 'Ciao bella!', 'Did you see the match?', 'Ha ha ha!', 'Mamma mia, the prices!', 'Espresso?', 'No way!', 'And then he said...', 'Ma dai!', 'Che bello!', 'My mother-in-law...', 'Ha! Classic.', 'Allora...', 'Bellissimo!', 'Did you hear about Luigi?', 'The prices, madonna!', 'Juventus again...', 'My knee is killing me.', 'Is it going to rain?', 'Nice shoes!', 'Pizza tonight?', 'My cousin in America...', 'Look at that pigeon.', 'Ecco!', 'Is it me, or does it smell like cabbage?', 'Shh, here comes the gas man.'],
  fanCombo: ['CHAIN FARTER!', 'He does not stop!', 'COMBO!', 'Again?! LEGEND!', 'Machine gun!', 'Both ends! Respect!', 'It is a symphony!', 'He is playing a SONG!', 'Keep going! KEEP GOING!', 'Human trumpet!', 'The man is a machine!'],
  fanClose: ['RIGHT IN THE FACE! LEGEND!', 'I FELT THE BASS!', 'Front row seats!'],
  // the fancy lady with the selfie stick
  selfie: ['#piazzavibes', 'Say cheese!', 'Duck face!', '#blessed', 'One more...', 'Filter: Tuscany', 'Like and subscribe!', 'My good side...'],
  ladyAngry: ['How DARE you!', 'My selfie is RUINED!', 'You BRUTE!', 'Come here, you animal!', 'This dress is GUCCI!', 'I have 2 million followers!'],
  ladyHit: ['Take THAT!', 'Uncultured swine!', 'UNFOLLOW!', 'BLOCKED!'],
  ladyGiveUp: ['Ugh! Unfollow!', 'You are not worth my heels.', 'Blocked. Reported.'],
  dazed: ['OUCH!', 'Stars... pretty stars...', 'Worth it.', 'Mamma...', 'Who turned off the lights?'],
  // toxic-combo events
  hazmat: ['9000 micro-farts!', 'Off the scale!', 'Write that down!', 'Worse than 1986!', 'Evacuate the piazza!', 'Is that... beans?', 'Do NOT breathe!', 'Seal the fountain!'],
  notes: ['Noted.', 'Beans. Definitely beans.', '*scribble scribble*', 'Level: Gino.'],
  fireman: ['Stand back! Toxic gas!', 'Suck it up, boys!', 'Hose ON!', 'Worst call this week!'],
  window: ['?', '??', 'Who ate the beans?!', 'Close the window!', 'Is it the sewer?', 'Mamma mia...', 'Somebody call the mayor!', 'Not again!'],
};

export const pick = (a) => a[(Math.random() * a.length) | 0];

// ---------- the wind warriors ----------
// speed/run: m/s. tank: max gas. power: blast and hearing reach. stench: cloud strength.
// control: how well the valve holds (higher = shart meter rises slower). pitch: voice of farts and burps.
// stats: 1-5 bars on the choose screen. lines: replace the default lines above for this hero.
export const HEROES = [
  {
    id: 'boy', name: 'Little Luca', age: 9, emoji: '👦',
    blurb: 'Quick and cheeky. Small tank, high squeaky voice. Mamma will hear about this.',
    intro: 'You are Luca. Luca is 9. Luca is always hungry. Luca has a gift, and it is not homework.',
    tips: [
      'Grab snacks off the street. <b>What you ate last</b> decides how you toot.',
      'Fizzy drinks mean <b>bigger burps</b>. Garlic and onion mean <b>stink burps</b>.',
      'Hold the button longer for a bigger blast. Your tank is small, so pick your moment.',
      'Some grown-ups think you are a legend. Women get their hair blown wild and ask where your mother is.',
      'Chain farts and burps fast after each other for a <b>combo</b>. Only your <b>best combo</b> counts. Burps score a bit less.',
      'Your belly is young and tough: the <b>💩 shart meter</b> rises slowly. But it still rises.',
    ],
    speed: 4.6, run: 7.2, tank: 70, power: 0.8, stench: 0.85, control: 1.4, pitch: 1.25,
    stats: { speed: 5, blast: 2, stench: 2, control: 5 },
    round: 'Recess', over: 'Recess is over!', home: 'Back to class, Luca. Your teacher can smell you from here.',
    sharted: 'Luca has to call mamma for clean pants.', pause: 'Luca is holding it in. Barely.',
    lines: {
      hero: ['Hehehe!', 'Did you hear that?!', 'That was me!', 'Mamma is gonna kill me', 'Again! Again!', 'Pew pew!', 'Beat that!'],
      strain: ['Nnngh!', 'Hnnnnng!', 'Careful Luca...'],
      eat: ['Yummy!', 'Nom nom!', 'More!', 'Don\'t tell mamma!'],
      empty: ['...nothing?', 'Empty!', 'I need snacks!'],
      shart: ['Uh oh...', 'MAMMAAA!', 'That wasn\'t air...'],
      fan: ['Good one, kid!', 'Ha! Little legend!', 'Respect, little man!', 'That kid has talent!', 'The future is bright!'],
      fanClose: ['Kid, that went in my MOUTH!', 'Tiny kid, huge blast!'],
      meh: ['Where are your parents?', 'Go home, kid.', 'Cute... not.', 'Kids these days.'],
      womanMeh: ['Where is your MOTHER?', 'Ugh, children.', 'Brat!'],
      curse: ['BRAT!', 'Where is your MOTHER?!', '#@$%! kid!', 'MY HAIR, you little...!'],
    },
  },
  {
    id: 'man', name: 'Marco', age: 35, emoji: '🧔',
    blurb: 'Mister Average. Decent speed, decent blast, decent control. Nobody expects it from him.',
    intro: 'You are Marco. Marco is 35. Marco is nobody special. That is his secret weapon.',
    tips: [
      'Eat street food. <b>What you ate last</b> decides how you fart.',
      'Drinks give <b>bigger burps</b>. Garlic and onion give <b>stink burps</b>.',
      'Hold the button longer for a bigger blast. Aim with the mouse.',
      'Some guys love a good one. Women get their hair blown wild. Everybody runs from the stench.',
      'Chain farts and burps fast after each other for a <b>combo</b>. Only your <b>best combo</b> counts. Burps score a bit less.',
      'Watch the <b>💩 shart meter</b>. Push your luck with the wrong food and it is game over.',
    ],
    speed: 4.0, run: 6.6, tank: 100, power: 1, stench: 1, control: 1.1, pitch: 1.05,
    stats: { speed: 4, blast: 3, stench: 3, control: 4 },
    round: 'Lunch break', over: 'Lunch break is over!', home: 'Back to the office, Marco. The meeting will be... memorable.',
    sharted: 'Marco has to explain this to his wife.', pause: 'Marco is holding it in.',
    lines: {
      hero: ['Excuse me.', 'Whoops.', 'Not sorry.', 'Better out than in.', 'Did someone step on a duck?', 'Scusi!'],
      strain: ['Nnnngh!', 'Careful Marco...', 'Hnnngh!'],
    },
  },
  {
    id: 'fat', name: 'Gino', age: 48, emoji: '🍝',
    blurb: 'Big belly, big thunder. Slow on his feet, but his blasts reach the other side of the square.',
    intro: 'You are Gino. Gino is big. Gino is hungry. Gino has a gift.',
    tips: [
      'Eat street food. <b>What you ate last</b> decides how you fart.',
      'Drinks give <b>bigger burps</b>. Garlic and onion give <b>stink burps</b>.',
      "Hold the button longer for a bigger blast. Gino's thunder reaches the whole square.",
      'Some guys love a good one. Women get their hair blown wild. Everybody runs from the stench.',
      'Chain farts and burps fast after each other for a <b>combo</b>. Only your <b>best combo</b> counts. Burps score a bit less.',
      'Watch the <b>💩 shart meter</b>. Too much of the wrong food and it is game over.',
    ],
    speed: 3.4, run: 5.6, tank: 100, power: 1.3, stench: 1.15, control: 0.9, pitch: 0.94,
    stats: { speed: 2, blast: 5, stench: 4, control: 3 },
    round: 'Lunch break', over: 'Lunch break is over!', home: 'Back to work, Gino. You smell like a legend.',
    sharted: 'Gino has to go home and change his shorts.', pause: 'Gino is holding it in.',
    lines: {
      hero: ['Scusi!', 'Better out than in!', 'Pardon my Italian.', 'Bellissimo.', 'Still got it.', 'That one was for you, mamma!', 'Ahhh...', 'Grazie, grazie.'],
      strain: ['Nnnngh!', 'Careful Gino...', 'Hnnngh!'],
    },
  },
  {
    id: 'old', name: 'Nonno Beppe', age: 84, emoji: '👴',
    blurb: 'Slow and wobbly, with a stench from another century. His valve is loose: sharts come easy.',
    intro: 'You are Nonno Beppe. Beppe is 84. Beppe has seen everything. Now the piazza will smell everything.',
    tips: [
      'Eat what you find. <b>What you ate last</b> decides how you fart. Your teeth decide nothing.',
      'Drinks give <b>bigger burps</b>. Garlic and onion give <b>stink burps</b>, like in the old days.',
      'Hold the button longer for a bigger blast. You are slow, so let the stench do the walking.',
      'The young guys call you a veteran. Women get their hair blown wild and call you a dirty old man.',
      'Chain farts and burps fast after each other for a <b>combo</b>. Only your <b>best combo</b> counts. Burps score a bit less.',
      'Your valve is old: the <b>💩 shart meter</b> climbs fast. One wrong fart and you go home early.',
    ],
    speed: 2.7, run: 3.9, tank: 100, power: 1.05, stench: 1.7, control: 0.65, pitch: 0.86,
    stats: { speed: 1, blast: 3, stench: 5, control: 1 },
    round: 'Afternoon walk', over: 'Nap time!', home: 'Back to the bench, Nonno. The pigeons missed you.',
    sharted: 'Nonno Beppe has to go home. Again.', pause: 'Nonno is resting his legs.',
    lines: {
      hero: ['In my day we farted LOUDER!', 'Eh?', 'Ahh, 1956 all over again.', 'Scusate, ragazzi.', 'Still works!', 'My doctor says it\'s healthy.', 'What? I didn\'t hear anything.'],
      strain: ['Oof...', 'Easy, Beppe...', 'My back!'],
      eat: ['Mmm... like mamma made.', 'Delizioso.', 'Where are my teeth?'],
      empty: ['Eh... nothing.', 'Not today.', 'Wait for it... no.'],
      shart: ['Ah. Not again.', '...eh.', 'Mamma mia...'],
      fan: ['Respect for the elders!', 'Nonno still got it!', 'Old school!', 'A true veteran!', 'Legend never dies!'],
      fanClose: ['NONNO! WHY?!', 'Vintage gas! Straight in my face!'],
      meh: ['At his age?!', 'Sir, please.', 'Somebody call his family.'],
      womanMeh: ['Dirty old man!', 'At his AGE?!', 'Shameful.'],
      curse: ['DIRTY OLD MAN!', '#@$%! Nonno!', 'MY HAIR, you old goat!', '@#$%! pervert!'],
    },
  },
];
export const heroById = (id) => HEROES.find((h) => h.id === id) || HEROES[2];
