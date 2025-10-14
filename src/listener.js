// @ts-check

import { effect } from './index.js';
export * from './index.js';

/**
 * @template T
 */
class ChangeEvent extends Event {
  /** @type {T} */
  #target;

  /**
   * @param {T} target 
   */
  constructor(target) {
    super('change');
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

/** @type {WeakMap<object, Map<(event?:Event) => void, import('./index.js').cleanup>>} */
const listeners = new WeakMap;

/**
 * @template T
 * @param {T} target
 * @param {(event?:Event) => void} listener
 * @returns {T}
 */
export const addEffectListener = (target, listener) => {
  let effects = listeners.get(target);
  if (!effects) {
    effects = new Map;
    listeners.set(target, effects);
  }
  if (!effects.has(listener)) {
    effects.set(
      listener,
      effect(listener.bind(void 0, new ChangeEvent(target)))
    );
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
