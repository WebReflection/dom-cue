export * from "./nested.js";
export function addEffectListener<T>(target: T, listener: Listener | Handler): T;
export function removeEffectListener<T>(target: T, listener: (event?: Event) => void): T;
export type Listener = (event?: Event) => void;
export type Handler = (EventListener & {
    handleEvent: Listener;
});
