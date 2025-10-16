// @ts-check

/** @typedef {(event?:Event) => void} Listener */
/** @typedef {(EventListener & { handleEvent: Listener })} Handler */

import { effect } from './index.js';
export * from './index.js';

/**
 * @template T
 */
class EffectEvent extends Event {
  /** @type {T} */
  #target;

  /**
   * @param {T} target 
   */
  constructor(target) {
    super('effect');
    this.#target = target;
  }

  // @ts-ignore
  get target() {
    return this.#target;
  }

  // @ts-ignore
  get currentTarget() {
    return this.#target;
  }
}

/** @type {WeakMap<object, Map<(Listener | Handler), import('./index.js').cleanup>>} */
const listeners = new WeakMap;

/**
 * @template T
 * @param {T} target
 * @param {Listener | Handler} listener
 * @returns {T}
 */
export const addEffectListener = (target, listener) => {
  let effects = listeners.get(target);
  if (!effects) {
    effects = new Map;
    listeners.set(target, effects);
  }
  if (!effects.has(listener)) {
    const ctx = typeof listener === 'function' ? void 0 : listener;
    const fn = ctx ? /** @type {Handler} */ (listener).handleEvent : listener;
    effects.set(listener, effect(fn.bind(ctx, new EffectEvent(target))));
  }
  return target;
};

/**
 * @template T
 * @param {T} target
 * @param {(event?:Event) => void} listener
 * @returns {T}
 */
export const removeEffectListener = (target, listener) => {
  let effects = listeners.get(target);
  effects?.get(listener)?.();
  effects?.delete(listener);
  return target;
};
