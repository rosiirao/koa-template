import { customAlphabet } from 'nanoid';
import createPromise from './promise-util';

const idMaker = (() => {
  const g = (function* () {
    // a value for initial, call g.next() immediately to initial the id
    let id: number = (yield -1) ?? 1;
    while (true) {
      id = (yield id++) ?? id;
    }
  })();
  g.next(); // initialize generator, so we can indicate the id when firstly call idMake.next(id);
  return g;
})();

/**
 * @param id the value the generator will restart from.
 * @return an auto increment id, the start value is 1 if the *id* parameter is not set
 */
export const nextId = (id?: number): number => idMaker.next(id!).value;

/**
 *
 * Slice a array to multiple part and map every part to a new value
 * @return the summary of result mapped from slice parts
 */
export const sliceMap = <T, R = Array<T>>(
  input: Array<T>,
  count: number,
  mapSlice = (slice: Array<T>) => slice as unknown as R
): Array<R> => {
  if (count <= 0 || count > input.length) return [mapSlice(input)];

  const list = [] as Array<R>;
  for (let i = 0; i < input.length; i = i + count) {
    list.push(mapSlice(input.slice(i, i + count)));
  }
  return list;
};

/**
 * Generate a list in start..range
 * @return the summary of result
 */
export const rangeList = <R>(
  range: number,
  mapItem = ((index: number) => index) as unknown as (
    x: number,
    acc?: Array<R>
  ) => R,
  start = 0
): Array<R> => {
  if (start > range) return [];
  const r = [] as Array<R>;
  for (let i = 0; i < range; i++) {
    r.push(mapItem(i, r));
  }
  return r;
};

/**
 * AsyncExecutor manage the async executions
 */
export interface AsyncExecutor<T> {
  /**
   * Add execution to the queue
   * @returns tje promise of the result of the execution
   */
  add: (execution: () => Promise<T>) => Promise<T>;
  /**
   * Finish the executor, and close the queue
   * @returns the promise of the result contains every execution
   */
  finish: () => Promise<Array<T>>;
}

/**
 * Limit the number of the async executions under an limit count, when it reach the quota, wait util previous resolved
 * @todo If reach the quota, start next one once one of previous resolved
 */
export const debounceAsyncExecutor = <T>(quota: number): AsyncExecutor<T> => {
  let dice = 0,
    finished = false;
  const summary = [] as Array<Promise<T>>;
  const queue = [] as Array<Promise<T>>;
  let lastExecution: Promise<void> = Promise.resolve(),
    lastExecutionReady: () => void;

  const asyncAddExecution = async (execution: () => Promise<T>) => {
    [lastExecution, lastExecutionReady] = createPromise<void>();
    if (dice >= quota) {
      await Promise.all(queue);
      queue.length = 0;
      dice = 0;
    }
    const result = execution();
    lastExecutionReady();
    queue.push(result);
    summary.push(result);
    dice++;
    return result;
  };

  const add = (execution: () => Promise<T>) => {
    if (finished)
      throw new Error(
        "Executor can't add execution after it has been finish()"
      );
    return asyncAddExecution(execution);
  };

  const finish = () => (
    /** After the lastExecution started then the promise of summary is integrated */
    (finished = true), lastExecution.then(() => Promise.all(summary))
  );

  return {
    add,
    finish,
  };
};

/**
 * Get a random int under the *max*, excluded, and *min*, the *min* is 0 default
 */
export function randomArbitrary(max: number, min = 0): number {
  return Math.floor(Math.random() * (max - 1 - min) + min);
}

/**
 * Generate random character, default all are lowercase Alphabets
 * @param mixin any characters you want mixin to the result
 */
export function randomCharacter(
  mixin = '',
  option?: {
    maxLen?: number;
    Uppercase?: boolean;
  }
): string {
  const { maxLen = 8, Uppercase = false } = option ?? {};
  const alphabets = 'abcdefghijklmnopqrstuvwxyz';
  const nanoid = customAlphabet(
    alphabets +
      (Uppercase ? alphabets.toUpperCase() : '') +
      mixin.replace(/[a-z]/gi, ''),
    maxLen
  );

  const min = randomArbitrary(Math.floor(maxLen / 2));
  const max = randomArbitrary(maxLen, Math.floor(maxLen / 2));
  try {
    return nanoid().slice(min, max);
  } catch (e) {
    console.error(e);
    return '';
  }
}

/**
 * Works like JSON.stringify, but it can convert Set and Map to JSON Array and JSON Object
 */
export function jsonStringify(
  json_input: unknown,
  space?: string
): string | undefined {
  const space_insert = (level: number) =>
    space ? `${rangeList(level, () => space).join('')}` : '';
  const wrap_insert = space ? '\n' : '';

  // if valueStack existed when loop, it must be a cyclic error
  const valueStack = new Set();

  function jsonStringifyInLevel(x: unknown, level: number): string | undefined {
    if (valueStack.has(x)) throw new TypeError('cyclic object value');

    valueStack.add(x);
    const left_space = space_insert(level);
    const tab_space = space_insert(level + 1);
    if (!(x instanceof Object)) {
      try {
        return JSON.stringify(x, null, space);
      } finally {
        valueStack.delete(x);
      }
    }

    if (Array.isArray(x)) {
      try {
        return `[${wrap_insert}${tab_space}${x
          .map((v) => jsonStringifyInLevel(v, level + 1))
          .join(`,${wrap_insert}${tab_space}`)}${wrap_insert}${left_space}]`;
      } finally {
        valueStack.delete(x);
      }
    }
    if (x instanceof Set) {
      try {
        return jsonStringifyInLevel([...x], level);
      } finally {
        valueStack.delete(x);
      }
    }
    if (x instanceof Map) {
      try {
        return jsonStringifyInLevel(
          [...x.keys()].reduce<Record<string, unknown>>((acc, k) => {
            acc[String(k)] = x.get(k);
            return acc;
          }, {}),
          level
        );
      } finally {
        valueStack.delete(x);
      }
    }

    const pair = Object.entries(x).reduce<Array<string>>((acc, entry) => {
      const [key, value] = entry;
      const jsonValue = jsonStringifyInLevel(value, level + 1);
      if (jsonValue === undefined) return acc;
      acc.push(`${JSON.stringify(String(key))}: ${jsonValue}`);
      return acc;
    }, []);

    try {
      return `{${wrap_insert}${tab_space}${pair.join(
        `,${wrap_insert}${tab_space}`
      )}${wrap_insert}${left_space}}`;
    } finally {
      valueStack.delete(x);
    }
  }
  return jsonStringifyInLevel(json_input, 0);
}
