# About this module signals implementation

This document's goal is to describe what *signals* are and how these work within this module,
considering this is just one out of dozens of different variants where performance or features
might be better or richer, yet the goal here was to really provide a "*good enough*"
architecture that scales well, performs well and, most importantly, fits in less than 600 bytes
once minified and compressed.

Please remember that this API is fully based on [Preact Signals](https://preactjs.com/guide/v10/signals/), so that more documentation around this topic can be found out there.

## What is a Signal ?

Imagine a *red 🟥 / green 🟩* traffic light 🚦 as a metaphor to describe what signals are and how these work:

  * if you don't pass through that road, you have no interest about their state
  * if you do pass through that road, you drive accordingly to their state:
    * *red* 🟥 means stop the car and wait for a state change
    * *green* 🟩 means keep going or start the engine again and move on
  * if you never need to pass through that road again, you can forget about that traffic light

If this metaphor is not good enough, let's try with some concrete examples:

```python
tl = signal("🟥")

@computed
def journey():
    # while executing, we subscribe to `tl`
    # signal by accessing its current value
    if tl.value == "🟥":
        return "waiting"
    else:
        return "driving"

# let's "compute" the current journey value
print(journey.value) # "waiting"

# ... time passes ...
import time
time.sleep(1)

# the signal value changes
tl.value = "🟩"

# if we access again the journey.value
# it will be executed, hence updated
print(journey.value) # "driving"
```

In this basic example there are a few things to observe that are part of the deal:

  * the `journey` function is executed only when its `value` field is accessed, **but**:
    * if the signal hasn't changed state, `journey.value` will return its latest computed result and **it will not execute again**
    * if the signal state changed between one `journey.value` access and another, its computed result will be updated and it will never execute again (or at least, not until `tl.value` changes again)
  * we can access `journey.value` dozens of times without worrying it's going to invoke its logic over and over, that's the "*magic*" of *computed* signals, they make code automatically efficient without much thinking!

On the other hand, in the previous basic example it's our code explicitly accessing `journey.value` to retrieve its latest state, which is very different from how *Event*-driven logic works: the `journey` logic won't ever run again unless we access its `value`!

## What is an Effect ?

An *effect* is, behind the scenes, a special *computed* reference that automatically executes whenever a *signal* changes its state, as opposed to requiring manual access to its `.value`.

Keeping the example simple, let's see how *effect* changes the previous code and behaves more like an *Event* listener:

```python
tl = signal("🟥")

@effect
def journey():
    # while executing, we subscribe to `tl`
    # signal by accessing its current value
    if tl.value == "🟥":
        print("waiting")
    else:
        print("driving")

# effects are instantly resolved/computed
# "waiting"

# ... time passes ...
import time
time.sleep(1)

# the signal value changes
tl.value = "🟩"

# effect will run again without hints
# "driving"
```

The *beauty* or *power* of *effects*, compared to an *event listeners*-based approach, is that one can automatically subscribe to multiple *signals* or even multiple *computed* references, which is something otherwise convoluted to orchestrate in JS via listeners:

```js
// meta-example code
function reactiveCallback({ target, type }) {
  switch (type) {
    case 'changed': {
      // do something related to changes
      break;
    }
    case 'updated': {
      // do something related to updates
      break;
    }
    case 'erased': {
      // do something related to erase
      break;
    }
  }

  // there is no way to also operate on both change
  // and updated or erased at the same time
  // events are always unique and never grouped

  // let's imagine we want to remove all listeners
  if (condition) {
    el.removeEventListener('changed', reactiveCallback);
    el.removeEventListener('updated', reactiveCallback);
    el.removeEventListener('erased', reactiveCallback);
  }
}

el.addEventListener('changed', reactiveCallback);
el.addEventListener('updated', reactiveCallback);
el.addEventListener('erased', reactiveCallback);
```

In comparison, using *signals* would be slightly more natural:

```python
# actual example that works as expected

changed = signal(False)
updated = signal(False)
erased = signal(False)

@effect
def reactive_callback():
    print("[computing]")
    # a "batched" change could've updated all
    # signals subscribed in this effect, for example:
    if changed.value:
        print("changed")

    if updated.value:
        print("updated")

    if erased.value:
        print("erased")

    # cleanup this effect if all signals are True
    if changed.value and updated.value and erased.value:
        reactive_callback()

# first implicit *run*
# "[computing]"

# change many signals at once
@batch
def change_many():
    changed.value = not changed.value
    updated.value = not updated.value

# now the effect will run *once* with 2 changes

# "[computing]"
# "changed"
# "updated"

# update the last signal to cleanup the *effect*
erased.value = not erased.value

# "[computing]"
# "changed"
# "updated"
# "erased"

# because these are all `True` and the *effect* is gone,
# changes to these signals will not trigger the effect
changed.value = not changed.value
updated.value = not updated.value
erased.value = not erased.value

# ... crickets ... nothing logged, goodbye effect 👋
```

With this counter example we have learned at least a couple of things:

  * an *effect* can subscribe to multiple *signals* or *computed* references
  * an effect can be "*destroyed*" by invoking itself, as that's something one should never do manually except to clean up the *effect* because the whole point of *effects* is that these are automatically handled by the signals *implementation*

Last, but not least, while cleaning an *effect* is usually more rare than useful, it is also possible to return a callback that will run before the *effect* is invoked again:

```python
count = signal(0)

@effect
def counter():
    print(f"count is now {count.value}")

    return lambda: print("it's now different")

# "count is now 0"

count.value += 1
# "it's now different"
# "count is now 1"

count.value += 1
# "it's now different"
# "count is now 2"
```

The "*cleanup*" optionally returned function hence provides a way to *abort* some network request, stop intervals created within the effect, invalidate some previous state or even just log the fact that the effect is being "*destroyed*" or it's going to be updated.

### Nested Effects

Each *effect* is confined within its logic but it's possible to have multiple effects with an outer "*main effect*":

```python
counter = signal(0)
multiplier = signal(1)
op = computed(lambda: counter.value * multiplier.value)

@effect
def main():
    print(f"the counter is now {counter.value}")

    @effect
    def multiplied():
        # `.peek()` to retrieve a value without subscribing
        m = multiplier.peek()
        # `multiplier` is subscribed by `op` implicitly
        print(f"  • multiplied by {m} is {op.value}")

# the counter is now 0
#   • multiplied by 1 is 0

print("------------------------")

# both the main effect and the nested one depend
# on the counter value, directly or indirectly
counter.value = 2

# the counter is now 2
#   • multiplied by 1 is 0 # ❔ previous op.value
#   • multiplied by 1 is 2 # ✔️ updated op.value

print("------------------------")

# only the nested effect depends on the multiplier value
# so only the nested effect will run here
multiplier.value = 2

#   • multiplied by 2 is 4
```

In these nested effect examples we've learned even more things:

  * there is the possibility to have nested *effects* where the outer one will take care of orchestrating updates
  * there is a `signal.peek()` or `computed.peek()` utility to read some value without subscribing to it
  * some nested effects might run with previous values but the important thing is that their last run will update their computed value once and that will remain stable until something changes
  * computed can be used anywhere signals can be used

### The last one: untracked(callback)

Especially for debugging reasons, we might want to access signals or computed values without interfering with the rest of the logic or accidentally subscribing to signals we don't want to observe.

The `untracked` utility returns any value and it will never bother subscription:

```python
s = signal(1)

@untracked
def current_value():
    return s.value

print(current_value)
# 1
```

And that's it for this module API, the only thing left to discuss is *how* things are actually implemented here, which is a deep dive into technical details.

- - -

## Implementation Details

This module uses a shared state based on 3 possible scenarios:

  * `synchronous:boolean` that would result into instant operations to computed values
  * `tracking:boolean` that would avoid every single operation when *true*
  * `computing:Computing` that represents the currently running *computed* function (including *effects*)

For documentation and simplification sake, a *signal* is nothing more than a `Set` with a special `value` accessor:

```js
// (note: some pseudo-code in here used to explain)

class Signal extends Set {
  // raw signal value as private field
  #value;

  // create a signal with an initial value
  constructor(value) {
    this.#value = value;
  }

  // define the `value` accessor:
  get value() {
    // when both conditions are not "falsy"
    if (tracking && computing) {
      // add the current computing once to this signal
      this.add(computing);
      // also relate this signal to the computing
      computing.add(this);
    }
    return this.#value;
  }
  set value(newValue) {
    // only when something changed ...
    if (newValue !== this.#value) {
      // store the newValue so that next time it's accessed
      // it will be returned as updated
      this.#value = newValue;
      // grab all registered computed functions
      const computed = [...this];
      // free this signal so it won't leak references
      this.clear();
      // notify computeds that this values changed
      // `update` is an internal reference used to inform
      // computed references that their callback must run again
      computed.forEach(update);
    }
  }

  // an extra method to retrieve the value without subscribing
  peek() {
    return this.#value;
  }
}
```

A *computed* reference is also a *signal*, except it's a read-only one:

```js
class Computed extends Signal {
  // the private callback to invoke when ...
  #callback;
  // the `compute` state is `true`
  #compute = true;
  // is this an effect ?
  #effect = false;
  // instantiate via a function that returns
  // some value, optionally based on signals subscription
  constructor(callback) {
    // the initial #value is still undefined
    super();
    this.#callback = callback;
  }

  // override the value accessor as read-only
  get value() {
    // check if it's the case to compute
    if (this.#compute) {
      // flag as computed to avoid re-invoking the callback
      this.#compute = false;
      // swap the computing value to subscribe if tracking
      const previous = computing;
      computing = this;
      // invoke the callback and store once its result
      super.#value = this.#callback();
      // put back the outer computing, if any
      computing = previous;
      // effects don't propagate subscribed signals
      // because these are self-contained, but computed do
      // because computed in computed should inform outer
      // computed or effects that some signal they subscribed to
      // changed after their latest invokaction
      if (!this.#effect && computing) {
        // nothing subscribes directly to computed, as read-only,
        // but all subscribed signals must be propagated
        // this is why signals are added to the computing reference
        const signals = [...this];
        // free this set to avoid leaks by retaining signals
        this.clear();
        // subscribe to the outer computing reference all signals
        for (const signal of signals) {
          signal.add(computing);
          computing.add(signal);
        }
        // if signal already had the computing, nothing happens
        // the same goes for the computing
      }
    }
    // return the raw value after update
    return super.#value;
  }
}
```

The previously mentioned `update` utility will basically flag the `computed.#compute = true` so that when its `.value` is accessed, it will calculate again the result.

In this module, computed references are **lazy**, meaning that their callback is invoked only when, or if, their `value` is accessed and never before.

A slightly different story goes for *effects*:

```js
class Effect extends Computed {
  constructor(callback) {
    // a special computed that stores the value directly
    super(() => {
      // store the optional cleanup function returned
      // by the callback, if any
      super.#value = callback();
    });

    // flag this computed as *effect*
    super.#effect = true;

    // run this computed right away via accessor
    super.value;
  }

  // a pseudo code that represent the disposal of the effect
  dispose() {
    // invoke the cleanup function if possible
    if (typeof super.#value === 'function')
        super.#value();

    // remove this computed from all subscribed signals
    for (const signal of this)
      signal.delete(this);
    // now signal changes will not trigger this computed

    // clear itself up
    this.clear();
  }
}
```

The previously mentioned `update` function will automatically invoke the *effect* if recognized as such and only if the `synchronous` operation is `true`, otherwise it stores the reference into a shared `set` that is used by the `batching` logic.

```js
const batches = new Set;

function batch(callback) {
  // batch in batch should still work
  // without disrupting the outer batch intent
  const previous = synchronous;
  synchronous = false;
  // all non synchronous operations will add
  // to batches the current computing reference
  callback();
  // set it back and that's it
  synchronous = previous;
  // now update all computed states
  const computed = [...batches];
  batches.clear();
  for (const computed in batch)
    update(computed);
}
```

The last operation is `untracked`, it's almost identical to `batch` except it simply toggles the `tracking` flag so that signals that are accessed during the invoke won't ever bother the rest of the logic.

