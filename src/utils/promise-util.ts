export type ThenArg<T> = T extends PromiseLike<infer U>
  ? U
  : T extends (...args: never[]) => PromiseLike<infer V>
  ? V
  : T;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const createPromise = <T = void, E extends Error = Error>() => {
  let ok: (value: T) => void, err: (err: E) => void;
  const p = new Promise<T>((r, j) => {
    ok = r;
    err = j;
  });
  return [p, ok!, err!] as const;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createPromiseResult = <T, E extends Error = Error>() => {
  const [p, ok, err] = createPromise<T, E>();
  return [wrap(p), ok, err] as const;
};

export default createPromise;

/**
 *  Promise Function, Promise or normal value type to It's Promise type
 */
type Promiser<T> = Promise<ThenArg<T>>;

/**
 * An Function type return Promise of T, and if T is PromiseFunction, then it return T's return type;
 * @example
 * PromiseFunction<PromiseFunction<T>> = PromiseFunction<T>
 */
type PromiseFunction<T> = (...args: never[]) => Promiser<T>;

export type Result<T, E = Error> = readonly [value?: T, error?: E];
export type PromiseResult<P, E = Error> = Promise<Result<ThenArg<P>, E>>;

/**
 * wrap a promise value to PromiseResult type
 */
const wrapValue = <T, E = Error>(value: Promise<T>): Promise<Result<T, E>> => {
  return value.then((r) => [r] as const).catch((e) => [undefined, e] as const);
};

/**
 * wrap a function return PromiseResult type.
 * don't use if directly, use {@link wrap} can get completely intellisense
 * @inner
 */
const wrapFunction =
  <F, E = Error>(
    /**
     * use PromiseFunction<T> as param type lost the parameter type infer in the return function type,
     * but it makes {@link wrap} works when it call wrapFunction<F, E>,
     * and {@link wrap} use PromiseFunction<F> as its general type parameter so that it can infer correct parameter type
     */
    func: PromiseFunction<F>
  ) =>
  (...args: Parameters<typeof func>) =>
    wrapValue<ThenArg<F>, E>(func(...args));

// type Wrap = typeof wrapFunction | typeof wrapResult;
export function wrap<T, E = Error>(response: Promise<T>): PromiseResult<T, E>;
export function wrap<F extends PromiseFunction<F>, E = Error>(
  func: F
): (...args: Parameters<typeof func>) => PromiseResult<ThenArg<typeof func>, E>;

/**
 * wrap a promise or promise function, if promise function, wrap it's result
 * @param thenable
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function wrap<F extends PromiseFunction<F> | Promiser<F>, E = Error>(
  thenable: F
) {
  // return thenable instanceof Function
  return isPromiseFunction<F>(thenable)
    ? wrapFunction<F, E>(thenable)
    : wrapValue<F, E>(thenable);
}

const isPromiseFunction = <F>(
  f: PromiseFunction<F> | Promiser<F>
): f is PromiseFunction<F> => {
  return typeof f === 'function';
};

export const unwrap = <T, E = Error>([response, error]: Result<T, E>): T => {
  if (error !== undefined) {
    throw error;
  }
  return response!;
};
