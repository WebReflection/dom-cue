export * from "./index.js";
export function addEffectListener<T>(target: T, listener: (event?: Event) => void): T;
export function removeEffectListener<T>(target: T, listener: (event?: Event) => void): T;
