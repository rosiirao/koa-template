import { wrap } from './promise-util.js';
import createPromise from './promise-util.js';

describe('promise util', () => {
  test.each([
    [undefined, undefined],
    ['string', undefined],
    [{}, new Error('an error')],
    ['b', undefined],
  ])('wrap promise result', async (input_result, input_error) => {
    const [p, ok, err] = createPromise<typeof input_result>();
    const promiseResult = () => wrap(p);
    if (input_error !== undefined) {
      err(input_error);
    }
    ok(input_result);
    const [result, error] = await promiseResult();
    if (error !== undefined) {
      if (input_error instanceof Error) expect(error).toBe(input_error);
      else expect(error.message).toBe(String(input_error));
      return;
    }
    expect(result).toBe(input_result);
  });

  test.each([
    [undefined, undefined],
    ['string', undefined],
    [{}, new Error('an error')],
    ['b', undefined],
  ])('wrap promise function', async (input_result, input_error) => {
    const [p, ok, err] = createPromise<typeof input_result>();
    const doPromise = (r: typeof input_result, e: typeof input_error) => {
      if (e !== undefined) {
        err(e);
      }
      ok(r);
      return p;
    };
    const promiseResult = wrap(doPromise);

    const [result, error] = await promiseResult(input_result, input_error);
    if (error !== undefined) {
      if (input_error instanceof Error) expect(error).toBe(input_error);
      else expect(error.message).toBe(String(input_error));
      return;
    }
    expect(result).toBe(input_result);
  });
});

/**
 * decorator to wrap method's return value
 * because typescript can't infer return type modified by decorators
 * so we can't use this now.
 * @Decorator Wrapper
 */
function Wrapper(
  _target: unknown, // static class or class instance
  _propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = wrap(originalMethod);
}

describe('decorator promise result wrapper', () => {
  class TestDecorator {
    @Wrapper
    static simple(x: string, e?: Error) {
      const [p, ok, err] = createPromise<string>();
      if (e !== undefined) err(e);
      ok(x);
      return p;
    }
  }
  test.each([
    ['1', undefined],
    ['2', new Error('second has an error')],
  ])(
    'decorator to wrap method return value',
    async (input_result, input_error) => {
      const r = await TestDecorator.simple(input_result, input_error);
      const value = input_error ? undefined : input_result;
      expect(r[0]).toEqual(value);
      expect(r[1]).toEqual(input_error);
    }
  );
});
