import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const source = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
let now = 0;
let nextId = 0;
const timers = new Map();
const frames = new Map();
const elements = new Map();
const element = () => ({
  textContent: '', disabled: false,
  classList: { add() {}, remove() {}, toggle() {} },
});
const Component = runInNewContext(`${source}; Component;`, {
  DCLogic: class { setState(update) { this.state = { ...this.state, ...update }; } },
  location: { pathname: '/', hash: '', search: '' },
  performance: { now: () => now },
  document: { querySelector: (selector) => elements.get(selector) || null },
  window: {},
  requestAnimationFrame: (callback) => { const id = ++nextId; frames.set(id, callback); return id; },
  cancelAnimationFrame: (id) => frames.delete(id),
  setTimeout: (callback, delay) => { const id = ++nextId; timers.set(id, { callback, delay }); return id; },
  clearTimeout: (id) => timers.delete(id),
});

function testRace(prompt = 'alpha bravo charlie delta echo foxtrot') {
  timers.clear();
  frames.clear();
  elements.clear();
  now = 0;
  const race = new Component();
  race._makeRacePrompt = () => prompt;
  race._prepareRace();
  race.state.factCard = 'typing';
  race._paintRace = () => {};
  race._setRaceDashboard = () => {};
  race._launchRaceConfetti = () => { race.celebrated = true; };
  for (const name of ['race-input', 'race-status', 'result-wpm', 'result-accuracy', 'result-raw', 'result-message', 'race-results']) {
    elements.set(`[data-${name}]`, element());
  }
  const input = elements.get('[data-race-input]');
  input.value = '';
  input.setSelectionRange = () => {};
  const type = (value) => { input.value = value; race._handleRaceInput({ target: input }); };
  return { race, input, type };
}

// Scoring follows Monkeytype's documented five-character word and its time-mode
// treatment of a correct partial final word; accuracy keeps input history.
// https://dev.monkeytype.com/account (stats)
// https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/utils/strings.ts
{
  const { race, type } = testRace();
  type('alpha bravo ');
  const stats = race._raceStats(race._raceTyped);
  assert.equal(stats.correct, 12);
  assert.equal(stats.wpm, 9.6);
  assert.equal(stats.raw, 9.6);
  assert.equal(stats.accuracy, 100);
  assert.equal(stats.errors, 0);
  type('alpha bravo ch');
  assert.equal(race._raceStats(race._raceTyped).correct, 14);
}
{
  const { race, type } = testRace();
  type('alphx bravo ');
  const stats = race._raceStats(race._raceTyped);
  assert.equal(stats.correct, 6, 'A submitted incorrect word must not inflate WPM');
  assert.equal(stats.wpm, 4.8);
  assert.equal(stats.raw, 9.6);
  assert.equal(stats.accuracy, 91.7, 'A space at the expected position is a correct key, even after a mistyped letter');
  type('alphx bravo cx');
  assert.equal(race._raceStats(race._raceTyped).correct, 6, 'An incorrect partial word must not inflate WPM');
}
{
  const { race, type } = testRace();
  type('alphx');
  type('alph');
  type('alpha');
  const stats = race._raceStats(race._raceTyped);
  assert.equal(stats.correct, 5);
  assert.equal(stats.errors, 1, 'Backspace must not erase an accuracy mistake');
  assert.equal(stats.accuracy, 83.3);
  assert.equal(stats.raw, 4, 'Deleted keystrokes must not inflate raw WPM');
}
{
  const { race, type } = testRace();
  type('Alpha ');
  assert.equal(race._raceStats(race._raceTyped).correct, 0, 'Uppercase must not silently become a correct lowercase letter');
  type('');
  assert.ok(race._raceStats('').accuracy < 100, 'Deleting everything must preserve accuracy history');
}
{
  const { race, type } = testRace();
  type('   ');
  assert.equal(race._raceStart, null, 'Ignored spaces must not start the timer');
  type('alpha  ');
  assert.equal(race._raceTyped, 'alpha ');
  assert.equal(race._raceCorrectKeys, 6, 'Repeated spaces must not inflate speed');
}
{
  const { race, type, input } = testRace();
  now = 5000;
  type('alpha');
  assert.equal(race._raceStart, 5000, 'Time must begin at first input');
  assert.equal([...timers.values()][0].delay, 15000);
  assert.equal(race._liveRaceStats(5500).wpm, 0, 'Do not flash an unstable first-key rate');
  assert.equal(race._liveRaceStats(10000).wpm, 12, 'Live speed must use actual elapsed time');
  now = 20001;
  type('alpha bravo');
  assert.equal(race._raceTyped, 'alpha', 'Input after the deadline must not count');
  assert.equal(input.value, 'alpha');
  assert.equal(input.disabled, true);
  assert.equal(race._raceFinished, true);
  assert.equal(frames.size, 0);
  assert.equal(timers.size, 0);
}
for (const [count, won] of [[202, false], [203, true]]) {
  const { race, type } = testRace('a'.repeat(300));
  type('a'.repeat(count));
  race._finishRace();
  assert.equal(Boolean(race.celebrated), won, 'Winning must use the unrounded 162 WPM threshold');
  assert.equal(elements.get('[data-result-message]').textContent, won ? 'Congratulations, you beat my typing speed!' : '');
  assert.equal(elements.get('[data-result-wpm]').textContent, String(Math.round(count * .8 * 10) / 10));
}
{
  const { race, type } = testRace();
  const ghost = [];
  race._paintGhost = (position) => ghost.push(position);
  now = 5000;
  type('alpha');
  const nextFrame = () => { const callback = frames.values().next().value; frames.clear(); return callback; };
  nextFrame()(4995);
  assert.equal(ghost.pop(), 0, 'A frame timestamp just before the first key must not put the ghost before the first character');
  nextFrame()(6000);
  assert.equal(ghost.pop(), 13.5, '162 WPM must move the ghost by 13.5 characters per second');
}
{
  const { race, type } = testRace();
  type('alpha');
  assert.equal(timers.size, 1);
  assert.equal(frames.size, 1);
  race._prepareRace();
  assert.equal(timers.size, 0, 'Restart must cancel the previous deadline');
  assert.equal(frames.size, 0, 'Restart must cancel the previous animation');
  assert.equal(race._raceStart, null);
  assert.equal(race._raceIncorrectKeys, 0);
}

console.log('Verified typing WPM, raw speed, partial words, corrected errors, case, spacing, timing, restart cleanup, and the 162 WPM win threshold.');
