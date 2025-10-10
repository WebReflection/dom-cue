import { signal, computed, effect, batch } from '../index.js';

var a = signal(1);
var b = signal(2);
var c = computed(() => a.value + b.value);

effect(() => {
  console.log('effect c', c.value);
  console.log('- - -');
  console.log('effect a', a.value);
  console.log('- - -');
  // effect inside effect should let the outer effect know
  // there is an effect inside it so that next time
  // if there was a callback to invoke it's invoked
  // and the new effect is registered/subscribed
  effect(() => {
    console.log('effect b', b.value);
    return () => console.log('inner');
  });
  return () => console.log('outer');
});

console.log('');
console.log('');
console.log('');

debugger;
b.value = 3;
