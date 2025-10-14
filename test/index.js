import { signal, computed, effect, batch } from '../src/index.js';

var a = signal(1);
var b = signal(2);
var c = computed(() => a.value + b.value);
effect(() => {
  console.log('effect', c.value);
  console.log('- - -');
  return () => console.log('unmounted');
});

a.value = 2;
b.value = 3;

a.value = 3;
b.value = 4;

batch(() => {
  a.value = 0;
  b.value = 1;
});
