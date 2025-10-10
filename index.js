// @ts-check

/** @typedef {(() => void) | null | undefined} cleanup */
/** @typedef {() => cleanup} fx */

const { Error, Event, EventTarget, Object, Set, String } = globalThis;
const { is } = Object;

const change = () => new Event(type);

const stack = [];
const type = 'change';
const batched = new Set;
const effects = new WeakMap;
const listeners = new WeakMap;

let synchronous = true, computing = false;

class ChangeEvent extends Event {
  #target;

  constructor(target) {
    super(type);
    this.#target = target;
  }

  get target() {
    return this.#target;
  }

  get currentTarget() {
    return this.#target;
  }
}

/**
 * A signal is a value that can be subscribed to and notified when it changes.
 * @template T
 * @param {T} value
 * @returns {Signal<T>}
 */
export class Signal extends EventTarget {
  /** @type {T} */
  #value;

  /**
   * @param {T} value
   */
  constructor(value) {
    super();
    this.#value = value;
  }

  /**
   * Return the value and implicitly subscribe the signal to the current computation, if any.
   * @returns {T}
   */
  get value() {
    if (computing) stack.push(this);
    return this.#value;
  }

  /**
   * Set the value and trigger a re-computation.
   * @param {T} value
   */
  set value(value) {
    if (!is(this.#value, value)) {
      this.#value = value;
      this.dispatchEvent(change());
    }
  }

  /**
   * Return the value without triggering a re-computation.
   * @returns {T}
   */
  peek() {
    return this.#value;
  }

  /**
   * Implicitly convert the signal to a string.
   * @returns {string}
   */
  toString() {
    return String(this.value);
  }

  /**
   * Implicitly subscribe the signal to the current computation.
   * @returns {T}
   */
  valueOf() {
    return this.value;
  }
}

/**
 * Create a signal with the given value.
 * @template T
 * @param {T} value
 * @returns {Signal<T>}
 */
export const signal = value => new Signal(value);

/**
 * A computed signal is a signal that is computed from other signals.
 * @template T
 * @param {() => T} getter
 * @returns {Computed<T>}
 */
export class Computed extends Signal {
  #getter;

  /** @type {T} */
  #value;

  #update() {
    const i = stack.length;
    const previously = computing;
    computing = true;
    try {
      this.#value = this.#getter();
      update.call(this, i);
    }
    finally {
      stack.splice(i);
      computing = previously;
    }
  }

  /**
   * Create a computed signal with the given callback that includes signals to watch.
   * @param {() => T} getter
   */
  constructor(getter) {
    super(void 0);
    this.#getter = getter;
    this.#update();
  }

  /**
   * Return the value and implicitly subscribe the signal to the current computation, if any.
   * @returns {T}
   */
  get value() {
    if (computing) stack.push(this);
    return this.#value;
  }

  /**
   * Throw an error if the computed signal is set.
   * @param {any} _
   */
  set value(_) {
    throw new Error('read-only');
  }

  /**
   * @param {Event} _
   */
  handleEvent(_) {
    this.#update();
    this.dispatchEvent(change());
  }

  /**
   * Return the value without subscribing to signals part of the current computation.
   * @returns {T}
   */
  peek() {
    return this.#value;
  }
}

/**
 * Create a computed signal with the given callback that includes signals to watch.
 * @template T
 * @param {() => T} getter
 * @returns {Computed<T>}
 */
export const computed = getter => new Computed(getter);

/**
 * An effect is a callback that is called when the signal changes.
 * @param {fx} callback
 * @returns {Effect}
 */
export class Effect extends EventTarget {
  #getter;

  /** @type {cleanup} */
  #value;

  #update() {
    const i = stack.length;
    const previously = computing;
    computing = true;
    try {
      if (typeof this.#value === 'function') this.#value();
      this.#value = this.#getter();
      update.call(this, i);
    }
    finally {
      stack.splice(i);
      computing = previously;
    }
  }

  /**
   * @param {fx} callback
   */
  constructor(callback) {
    super();
    this.#getter = callback;
    this.#update();
  }

  /**
   * @param {Event} _
   */
  handleEvent(_) {
    if (synchronous) this.#update();
    else batched.add(this);
  }
}

/**
 * Create an effect with the given callback.
 * @param {fx} callback
 */
export const effect = callback => {
  if (!effects.has(callback))
    effects.set(callback, new Effect(callback));
};

/**
 * Batch many updates into a single re-computation.
 * @param {() => void} callback
 * @returns {void}
 */
export const batch = callback => {
  const i = stack.length;
  const previously = computing;
  const batching = synchronous;
  computing = true;
  synchronous = false;
  try {
    callback();
    if (batched.size) {
      const effects = [...batched];
      batched.clear();
      synchronous = batching;
      for (const effect of effects)
        effect.handleEvent();
    }
  }
  finally {
    batched.clear();
    stack.splice(i);
    computing = previously;
    synchronous = batching;
  }
};

/**
 * Add a listener that reacts to signal changes.
 * @param {Element} target
 * @param {fx} callback
 * @returns
 */
export const addSignalListener = (target, callback) => {
  let map = listeners.get(target);
  if (!map) {
    map = new Map;
    listeners.set(target, map);
  }
  if (!map.has(callback)) {
    map.set(callback, new Effect(callback.bind(
      void 0,
      new ChangeEvent(target),
    )));
  }
  return target;
};

/**
 * Remove a listener that reacts to signal changes.
 * @param {Element} target
 * @param {fx} callback
 * @returns
 */
export const removeSignalListener = (target, callback) => {
  listeners.get(target)?.delete(callback);
  return target;
};

/**
 * @param {number} i
 */
function update(i) {
  for (const l = stack.length; i < l; i++)
    stack[i].addEventListener(type, this);
}
