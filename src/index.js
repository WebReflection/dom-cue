// @ts-check

/** @typedef {(() => void) | null | undefined} cleanup */
/** @typedef {() => cleanup} fx */

const { Event, Set, String } = globalThis;
const { toStringTag } = Symbol;
const { is } = Object;

const add = (ref, listener) => ref.addEventListener(type, listener, once);
const remove = (ref, listener) => ref.removeEventListener(type, listener);

const change = () => new Event(type);
const once = { once: true };
const type = 'change';

const batched = new Set;

let synchronous = true, tracked = true, computing = null;

// @protected Signal#get, Signal#set
let get, set;

/**
 * A signal is a value that can be subscribed to and notified when it changes.
 * @template T
 */
export class Signal extends EventTarget {
  static {
    /**
     * @template T
     * @param {Signal<T>} $
     * @returns {T}
     */
    get = $ => $.#value;

    /**
     * @template T
     * @param {Signal<T>} $
     * @param {T} value
     */
    set = ($, value) => {
      $.#value = value;
    };
  }

  /** @type {T} */
  #value;

  /**
   * Create a signal with the given value.
   * @param {T} value
   */
  constructor(value) {
    super();
    this.#value = value;
  }

  /**
   * @type {T}
   */
  get value() {
    if (tracked && computing) subscribe(computing, this);
    return this.#value;
  }
  set value(value) {
    if (!is(this.#value, value)) {
      this.#value = value;
      this.dispatchEvent(change());
    }
  }

  get [toStringTag]() {
    return 'Signal';
  }

  /**
   * Return the value without subscribing.
   * @returns {T}
   */
  peek() {
    return get(this);
  }

  toString() {
    return String(this.value);
  }

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

// @protected Computed#compute, Computed#subscribe, Computed#unsubscribe
let compute, subscribe, unsubscribe;

/**
 * A computed signal is a read-only signal that is computed from other signals.
 * @template T
 */
export class Computed extends Signal {
  static {
    /**
     * @template T
     * @param {Computed<T>} $
     * @returns {boolean}
     */
    compute = $ => $.#compute;

    /**
     * @template T,S
     * @param {Computed<T>} $
     * @param {Signal<S>} signal
     */
    subscribe = ($, signal) => {
      $.#signals.add(signal);
      add(signal, $);
    };

    /**
     * @template T
     * @param {Computed<T>} $
     */
    unsubscribe = $ => {
      for (const signal of $.#signals)
        remove(signal, $);
    };
  }

  /** @type {() => T} */
  #value;

  /** @type {boolean} */
  #compute = true;

  /** @type {boolean} */
  #subscribe = true;

  /** @type {Set<Signal<unknown>>} */
  #signals = new Set;

  /**
   * A computed signal is a signal that is computed from other signals.
   * @param {() => T} value
   */
  constructor(value, fx = false) {
    super(void 0);
    this.#value = value;
    this.#subscribe = !fx;
  }

  /**
   * @type {T}
   */
  get value() {
    if (this.#compute) {
      this.#compute = false;
      this.#signals.clear();
      const previously = computing;
      computing = this;
      try {
        set(this, this.#value());
      }
      finally {
        computing = previously;
      }
    }

    if (this.#subscribe && tracked && computing) {
      for (const signal of this.#signals)
        subscribe(computing, signal);
    }

    return get(this);
  }

  get [toStringTag]() {
    return 'Computed';
  }

  /**
   * @param {Event} event 
   */
  handleEvent(event) {
    this.#compute = true;
    if (synchronous) this.dispatchEvent(change());
    else batched.add(this);
  }

  peek() {
    if (this.#compute) {
      const subscribe = this.#subscribe;
      this.#subscribe = false;
      const value = this.value;
      this.#subscribe = subscribe;
      return value;
    }
    return get(this);
  }
}

/**
 * Create a computed signal via the given getter.
 * @template T
 * @param {() => T} value
 * @returns {Computed<T>}
 */
export const computed = value => new Computed(value);

/**
 * An effect is a callback that is automatically called when its signals change.
 * @param {fx} callback 
 * @returns {cleanup}
 */
export const effect = callback => {
  let value;
  const fx = new Computed(callback, true);
  const listener = () => {
    value?.();
    value = fx.value;
    add(fx, listener);
  };
  listener();
  return () => {
    remove(fx, listener);
    unsubscribe(fx);
    value?.();
  };
};

/**
 * Batch many updates into the least amount of re-computations.
 * @param {() => void} callback 
 */
export const batch = callback => {
  const finalize = synchronous;
  synchronous = false;
  try {
    callback();
    if (finalize && batched.size) {
      const batch = [...batched];
      batched.clear();
      synchronous = finalize;
      for (let i = 0; i < batch.length; i++) {
        if (compute(batch[i])) batch[i].handleEvent();
      }
    }
  }
  finally {
    synchronous = finalize;
  }
};

/**
 * Run the callback without tracking its signals.
 * @template T
 * @param {() => T} callback
 * @returns {T}
 */
export const untracked = callback => {
  const tracking = tracked;
  tracked = false;
  try {
    return callback();
  }
  finally {
    tracked = tracking;
  }
};
