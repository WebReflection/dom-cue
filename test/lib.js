import test from './test.js';

test('dom-cue', await import('../src/index.js'));

try {
  const preact = await import('https://esm.run/@preact/signals');
  test('@preact/signals', preact);
}
catch {}