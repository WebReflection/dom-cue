import { signal, computed, batch, untracked, effect } from '../index.js';

const a = signal(1);
const b = signal(2);
const c = computed(() => {
  const result = a.value + b.value;
  console.log('computing c', result);
  return result;
});

const d = computed(() => {
  const result = a.value + c.value;
  console.log('computing d', result);
  return result;
});

const e = computed(() => {
  const result = a.value + c.value + d.value;
  console.log('computing e', result);
  return result;
});

console.log('changing a');

a.value++;

console.log('changing b');

b.value++;

console.log('batching');

batch(() => {
  a.value++;
  b.value++;
});

console.log('nested batching');
batch(() => {
  a.value++;
  batch(() => {
    b.value++;
  });
});

console.log({ c: c.value, d: d.value, e: e.value });

untracked(() => {
  console.log('untracked', ++a.value);
});

console.log({ c: c.value, d: d.value, e: e.value });

console.log({}.toString.call(d));

effect(() => {
  console.log('effect', a.value, e.value);
  return () => console.log('unmounted 1');
});

console.log('no batching');

a.value++;
b.value++;

console.log('batching');

batch(() => {
  a.value++;
  b.value++;
});

console.log('');
console.log('');

effect(() => {
  console.log('outer', a.value);
  effect(() => {
    console.log('inner', c.value);
    return () => console.log('inner unmounted');
  });
  return () => console.log('outer unmounted');
});

batch(() => {

a.value++;
b.value++;
a.value++;
b.value++;

});
