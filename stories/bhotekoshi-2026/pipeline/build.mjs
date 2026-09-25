// Build the Bhote Koshi–Trishuli 2026 story: node build.mjs [step…]
// Steps are idempotent; network responses are cached in .cache/.
import { buildProvinces } from './steps/boundaries.mjs';
import { buildRivers } from './steps/rivers.mjs';
import { buildEms } from './steps/ems.mjs';
import { EVENTS, buildEvents } from './steps/events.mjs';
import { buildGauges2026, buildHot2026 } from './steps/themes.mjs';
import { buildPopulation } from './steps/population.mjs';
import { buildHydropower } from './steps/hydropower.mjs';
import { buildUnosat } from './steps/unosat.mjs';
import { buildImagery } from './steps/imagery.mjs';
import { buildMedia } from './steps/media.mjs';
import { buildStory } from './steps/story.mjs';

const STEPS = {
  boundaries: buildProvinces,
  rivers: buildRivers,
  ems: buildEms,
  ...Object.fromEntries(Object.keys(EVENTS).map((id) => [`event:${id}`, () => buildEvents([id])])),
  events: () => buildEvents(),
  gauges2026: buildGauges2026,
  hot2026: buildHot2026,
  population: buildPopulation,
  unosat: buildUnosat,
  hydropower: buildHydropower,
  imagery: buildImagery,
  media: buildMedia,
  story: buildStory,
};

const requested = process.argv.slice(2);
const run = requested.length ? requested : Object.keys(STEPS);
for (const name of run) {
  const step = STEPS[name];
  if (!step) {
    console.error(`unknown step "${name}" (have: ${Object.keys(STEPS).join(', ')})`);
    process.exit(1);
  }
  const t = Date.now();
  console.log(`▶ ${name}`);
  const result = await step();
  console.log(`✓ ${name} (${((Date.now() - t) / 1000).toFixed(1)} s)`, result ? JSON.stringify(result).slice(0, 300) : '');
}
