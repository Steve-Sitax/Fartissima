// Renders the artificial farts to WAV so tools/analyze_synth.py can compare them with the real ones.
import { writeFileSync, mkdirSync } from 'node:fs';
import { renderFart, fartParams, shartParams } from '../src/synth.js';
const SR = 44100;
mkdirSync('synth', { recursive: true });
function wav(name, x) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
  writeFileSync(`synth/${name}.wav`, b);
}
const foods = process.argv.slice(2).length ? process.argv.slice(2) : ['beans', 'chili', 'broc', 'egg', 'cheese', 'burrito', 'salad', 'beer'];
let t0 = Date.now();
for (const f of foods) for (const tier of [1, 3, 5]) wav(`fart_${f}_${tier}`, renderFart(fartParams(f, tier, 1234 + tier)));
wav('shart', renderFart(shartParams(7)));
console.log('rendered in', Date.now() - t0, 'ms');
