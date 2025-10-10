# dom-cue

<sup>**Social Media Photo by [Emily Richards](https://unsplash.com/@emilyrichardsss) on [Unsplash](https://unsplash.com/)**</sup>

A minimalistic signals implementation for vanilla DOM/JS, inspired by [Preact Signals API](https://preactjs.com/guide/v10/signals/) yet extremely simpler and easier to reason about around DOM changes, where the engine decideds what to *batch* and what not, keeping effects possible returned callbacks in mind.

```js
import { signal, computed, effect, batch, addSignalListener, removeSignalListener } from 'https://esm.run/dom-cue';

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
```