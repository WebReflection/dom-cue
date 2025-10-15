/**
 * A signal is a value that can be subscribed to and notified when it changes.
 * @template T
 */
export class Signal<T> extends Set<any> {
    /**
     * Create a signal with the given value.
     * @param {T} value
     */
    constructor(value: T);
    set value(value: T);
    /**
     * @type {T}
     */
    get value(): T;
    /**
     * Return the value without subscribing.
     * @returns {T}
     */
    peek(): T;
    valueOf(): T;
    #private;
}
export function signal<T>(value: T): Signal<T>;
/**
 * A computed signal is a read-only signal that is computed from other signals.
 * @template T
 */
export class Computed<T> extends Signal<any> {
    /**
     * A computed signal is a signal that is computed from other signals.
     * @param {() => T} value
     */
    constructor(value: () => T, fx?: boolean);
    /**
     * @type {T}
     */
    get value(): T;
    /**
     * Return the value without subscribing.
     * @returns {T}
     */
    peek(): T;
    #private;
}
export function computed<T>(value: () => T): Computed<T>;
export function effect(callback: fx): cleanup;
export function batch(callback: () => void): void;
export function untracked<T>(callback: () => T): T;
export type cleanup = (() => void) | null | undefined;
export type fx = () => cleanup;
