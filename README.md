# dom-cue

[![Coverage Status](https://coveralls.io/repos/github/WebReflection/dom-cue/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/dom-cue?branch=main)

<sup>**Social Media Photo by [Emily Richards](https://unsplash.com/@emilyrichardsss) on [Unsplash](https://unsplash.com/)**</sup>

A minimalistic signals implementation for vanilla DOM/JS, inspired by [Preact Signals API](https://preactjs.com/guide/v10/signals/).

<sub>**[Live Demo](https://codepen.io/WebReflection/pen/vELWNNx?editors=0010)**</sub>

```js
import {
  // https://esm.run/dom-cue exports
  Signal, signal,
  Computed, computed,
  effect, batch, untracked,

  // https://esm.run/dom-cue/listener extra exports
  addEffectListener, removeEffectListener,
} from 'https://esm.run/dom-cue/listener';

const a = signal(1);
const b = signal(2);
const c = computed(() => a.value + b.value);
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
