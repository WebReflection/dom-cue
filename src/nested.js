export * from './index.js';
import { effect as fx } from './index.js';

const clear = fn => fn();
const stack = [], empty = [];

/**
 * An effect is a callback that is automatically called when its signals change.
 * @param {import('./index.js').fx} callback 
 * @returns {import('./index.js').cleanup}
 */
export const effect = callback => {
  let nested = empty, length = 0;
  const clean = fx(() => {
    nested.forEach(clear);
    length = stack.length;
    const result = callback();
    nested = length < stack.length ? stack.splice(length) : empty;
    return result;
  });
  const up = () => {
    clean();
    nested.forEach(clear);
  };
  stack.push(up);
  return up;
};
