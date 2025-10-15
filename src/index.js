// @ts-check

/** @typedef {(() => void) | null | undefined} cleanup */
/** @typedef {() => cleanup} fx */

const S = String;
const is = Object.is;

/**
 * @param {Set} self
 * @returns {Computed[]}
 */
const cleared = self => {
  const computed = [...self];
  self.clear();
  return computed;
};

const batched = new Set;

let synchronous = true, tracked = true, computing = null;

// @protected Signal#set
let set;

/**
 * A signal is a value that can be subscribed to and notified when it changes.
 * @template T
 */
export class Signal extends Set {
  static {
    /**
     * @template T
     * @param {Signal<T>} signal
     * @param {T} value
     */
    set = (signal, value) => {
      signal.#value = value;
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
    if (tracked && computing) this.add(computing.add(this));
    return this.#value;
  }
  set value(value) {
    if (!is(this.#value, value)) {
      this.#value = value;
      for (const computed of cleared(this))
        update(computed);
    }
  }

  get [Symbol.toStringTag]() {
    return 'Signal';
  }

  /**
   * Return the value without subscribing.
   * @returns {T}
   */
  peek() {
    return this.#value;
  }

  toString() {
    return S(this.value);
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

// @protected Computed#compute, Computed#update
let compute, update;

/**
 * A computed signal is a read-only signal that is computed from other signals.
 * @template T
 */
export class Computed extends Signal {
  static {
    /**
     * @template T
     * @param {Computed<T>} computed
     * @returns {boolean}
     */
    compute = computed => computed.#compute;

    /**
     * @template T
     * @param {Computed<T>} computed
     */
    update = computed => {
      computed.#update();
    };
  }

  /** @type {boolean} */
  #compute = true;

  /** @type {boolean} */
  #subscribe = true;

  /** @type {() => T} */
  #value;

  #run() {
    if (this.#compute) {
      const previously = computing;
      computing = this;
      this.#compute = false;
      this.clear();
      try {
        set(this, this.#value());
      }
      finally {
        computing = previously;
      }
    }
  }

  #update() {
    this.#compute = true;
    if (synchronous) this.#subscribe || this.#run();
    else batched.add(this);
  }

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
    this.#run();

    if (this.#subscribe && tracked && computing) {
      for (const signal of cleared(this))
        signal.add(computing.add(signal));
    }

    return super.peek();
  }

  get [Symbol.toStringTag]() {
    return 'Computed';
  }

  /**
   * Return the value without subscribing.
   * @returns {T}
   */
  peek() {
    this.#run();
    return super.peek();
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
  const fx = new Computed(
    () => {
      value?.();
      value = callback();
    },
    true
  );
  fx.value;
  return () => {
    for (const signal of cleared(fx))
      signal.delete(fx);
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
      synchronous = finalize;
      for (const batch of cleared(batched)) {
        if (compute(batch)) update(batch);
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
