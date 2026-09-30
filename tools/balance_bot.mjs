// Needs: npm i -D playwright-core (not installed by default) and the dev server on 127.0.0.1:5178.
// Run: node tools/balance_bot.mjs
// Balance bot: every hero plays the same scenarios; prints best combo scores.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto('http://127.0.0.1:5178/');
await p.click('#btn-start');
await p.waitForFunction(() => window.__fartissima.state === 'choose', null, { timeout: 60000 });
await p.click('#btn-go');
await p.waitForFunction(() => window.__fartissima.state === 'play');
const SC = {
  'normal (beans, 2 medium farts)': { food: 'beans', seq: 'FF', tier: 3 },
  'strong (broccoli, 5x F/F/F/B/F big)': { food: 'broc', seq: 'FFFBF', tier: 5 },
  'real gas (broccoli+cola, full tanks)': { food: 'broc', seq: 'F65 B65 F30 B30 F20', real: true },
};
for (const [label, sc] of Object.entries(SC)) {
  const row = [];
  for (const hero of ['boy', 'man', 'fat', 'old']) {
    const scores = [];
    for (let run = 0; run < 5; run++) {
      scores.push(await p.evaluate(async ([hero, sc]) => {
        const { FOODS } = await import('/src/data.js');
        const g = window.__fartissima.game;
        g.reset(hero);
        const grp = [...g.groups].sort((a, b) => b.slots.filter((x) => x >= 0).length - a.slots.filter((x) => x >= 0).length)[0];
        g.gino.s.x = grp.x; g.gino.s.z = grp.z - 3; g.gino.s.rot = 0;
        const inp = { yaw: Math.PI };
        const step = (sec) => { for (let t = 0; t < sec; t += 1 / 30) g.update(1 / 30, inp); };
        step(1);
        g.eat(FOODS.find((f) => f.id === sc.food));
        if (sc.real) {
          g.gas.fart = g.hero.tank; g.gas.burp = g.hero.tank; g.shart = 0;
          for (const a of sc.seq.split(' ')) {
            const kind = a[0] === 'F' ? 'fart' : 'burp';
            const amount = Math.min(+a.slice(1), g.gas[kind]);
            if (amount >= 3) { g.charge = { kind, amount, full: 0 }; g.shart = 0; g.release(); }
            step(1.2);
          }
        } else for (const a of sc.seq) {
          g.gas.fart = g.hero.tank; g.gas.burp = g.hero.tank; g.shart = 0;
          if (a === 'F') g.fart(sc.tier); else g.burp(Math.max(1, sc.tier - 1));
          step(1.2);
        }
        step(45);
        return g.best?.score || 0;
      }, [hero, sc]));
    }
    row.push(`${hero}: ${Math.round(scores.reduce((a, c) => a + c, 0) / scores.length).toLocaleString('en-US')}`);
  }
  console.log(label.padEnd(38), row.join('   '));
}
await b.close();
