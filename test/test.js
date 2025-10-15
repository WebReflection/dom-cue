export default (name, { signal, computed, batch, untracked, effect }) => {

  console.log(`\x1b[1m${name}\x1b[0m`);

  const result = [];

  const log = (...args) => {
    result.push(args);
    console.log(' \u2022', ...args);
  };

  const test = (name, expected = []) => {
    expected = [].concat(expected);
    if (expected.length !== result.length) {
      console.error('expected', expected.length, 'results but got', result.length);
      throw new Error(name);
    }
    for (let i = 0; i < expected.length; i++) {
      if ([].concat(expected[i]).join(' ') !== result[i].join(' ')) {
        console.error('expected', expected[i], 'but got', result[i]);
        throw new Error(name);
      }
    }
    result.splice(0);
  };

  console.time('⏱️');

  const a = signal(1);
  const b = signal(2);
  const c = computed(() => {
    const result = a.value + b.value;
    log('computing c', result);
    return result;
  });

  const d = computed(() => {
    const result = a.value + c.value;
    log('computing d', result);
    return result;
  });

  const e = computed(() => {
    const result = a.value + c.value + d.value;
    log('computing e', result);
    return result;
  });

  a.value++;
  test('changed a');

  b.value++;
  test('changed b');

  batch(() => {
    a.value++;
    b.value++;
  });
  test('batched');
  
  batch(() => {
    a.value++;
    batch(() => {
      b.value++;
    });
  });
  test('nested batches');

  c.value;
  test('c.value', 'computing c 9');

  d.value;
  test('d.value', 'computing d 13');

  e.value;
  test('e.value', 'computing e 26');

  untracked(() => {
    log('untracked', ++a.value);
  });
  test('untracked', 'untracked 5');

  c.value;
  test('c.value', 'computing c 10');

  d.value;
  test('d.value', 'computing d 15');

  e.value;
  test('e.value', 'computing e 30');

  effect(() => {
    log('effect', a.value, e.value);
    return () => log('unmounted 1');
  });
  test('effect 1', 'effect 5 30');

  a.value++;
  b.value++;
  if (name === 'dom-cue') {
    test('no batch', [
      ['unmounted 1'],
      ['computing c', 11],
      ['computing d', 17],
      ['computing e', 34],
      ['effect', 6, 34],
      ['unmounted 1'],
      ['computing c', 12],
      ['computing d', 18],
      ['computing e', 36],
      ['effect', 6, 36],
    ]);
  }
  else if (name === '@preact/signals') {
    test('no batch', [
      ['unmounted 1'],
      ['computing c', 11],
      ['computing d', 17],
      ['computing e', 34],
      ['effect', 6, 34],
      ['computing c', 12],
      ['computing d', 18],
      ['computing e', 36],
      ['unmounted 1'],
      ['effect', 6, 36],
    ]);
  }

  batch(() => {
    a.value++;
    b.value++;
  });
  test('batched', [
    ['unmounted 1'],
    ['computing c', 14],
    ['computing d', 21],
    ['computing e', 42],
    ['effect', 7, 42],
  ]);

  const fx = effect(() => {
    log('outer', a.value);
    effect(() => {
      log('inner', c.value);
      return () => log('inner unmounted');
    });
    return () => log('outer unmounted');
  });

  test('nested effects', [
    ['outer', 7],
    ['inner', 14],
  ]);

  fx();
  test('cleanup', [
    ['outer unmounted'],
  ]);

  const z = signal(0);
  const comp = computed(() => {
    log('computing comp', z.value);
    return z.value;
  });
  comp.peek();
  test('peek #1', [
    ['computing comp', 0],
  ]);
  comp.peek();
  test('peek #2');
  z.value++;
  test('peek #3');
  comp.value;
  test('peek #1', [
    ['computing comp', 1],
  ]);

  console.timeEnd('⏱️');
  console.log('');

  if (name === 'dom-cue') {
    console.assert({}.toString.call(a) === '[object Signal]');
    console.assert({}.toString.call(c) === '[object Computed]');
    console.assert({}.toString.call(e) === '[object Computed]');

    const s = signal(0);
    effect(() => {
      console.assert(s.peek() === 0);
      console.assert(s.toString() === '0');
      console.assert(s.valueOf() === 0);
    })();
    s.value++;
  }
};
