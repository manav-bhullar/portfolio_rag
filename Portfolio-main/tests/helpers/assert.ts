import { inspect } from 'node:util';

export class AssertionError extends Error {
  actual?: unknown;
  expected?: unknown;

  constructor(message: string, actual?: unknown, expected?: unknown) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

function formatValue(v: unknown): string {
  return inspect(v, { depth: 4, colors: false, compact: true });
}

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!isDeepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

export function assert(condition: unknown, message = 'Assertion failed'): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (!Object.is(actual, expected)) {
    const msg = message || `Expected ${formatValue(expected)}, but received ${formatValue(actual)}`;
    throw new AssertionError(msg, actual, expected);
  }
}

export function assertDeepEqual<T>(actual: T, expected: T, message?: string): void {
  if (!isDeepEqual(actual, expected)) {
    const msg = message || `Expected deep equality:\nExpected: ${formatValue(expected)}\nReceived: ${formatValue(actual)}`;
    throw new AssertionError(msg, actual, expected);
  }
}

export function assertIncludes(actual: string | unknown[], expected: unknown, message?: string): void {
  if (typeof actual === 'string') {
    if (!actual.includes(String(expected))) {
      const msg = message || `Expected string to include "${expected}", but got:\n${actual}`;
      throw new AssertionError(msg, actual, expected);
    }
  } else if (Array.isArray(actual)) {
    const found = actual.some((item) => isDeepEqual(item, expected));
    if (!found) {
      const msg = message || `Expected array to contain item:\n${formatValue(expected)}\nArray contents:\n${formatValue(actual)}`;
      throw new AssertionError(msg, actual, expected);
    }
  } else {
    throw new AssertionError(`assertIncludes called on non-iterable type: ${typeof actual}`);
  }
}

export function assertMatch(actual: string, pattern: RegExp, message?: string): void {
  if (!pattern.test(actual)) {
    const msg = message || `Expected string to match ${pattern}, but got:\n${actual}`;
    throw new AssertionError(msg, actual, pattern.toString());
  }
}

export function expect<T>(actual: T, baseMessage?: string) {
  const getMsg = (m?: string, defaultMsg = '') => m || baseMessage || defaultMsg;

  return {
    toBe(expected: T, message?: string) {
      assertEqual(actual, expected, getMsg(message));
    },
    toEqual(expected: T, message?: string) {
      assertDeepEqual(actual, expected, getMsg(message));
    },
    toBeTruthy(message?: string) {
      if (!actual) {
        throw new AssertionError(getMsg(message, `Expected truthy value, but received ${formatValue(actual)}`), actual, true);
      }
    },
    toBeFalsy(message?: string) {
      if (actual) {
        throw new AssertionError(getMsg(message, `Expected falsy value, but received ${formatValue(actual)}`), actual, false);
      }
    },
    toBeDefined(message?: string) {
      if (actual === undefined) {
        throw new AssertionError(getMsg(message, 'Expected value to be defined, but was undefined'), actual, 'defined');
      }
    },
    toBeNull(message?: string) {
      if (actual !== null) {
        throw new AssertionError(getMsg(message, `Expected null, but received ${formatValue(actual)}`), actual, null);
      }
    },
    toContain(item: unknown, message?: string) {
      assertIncludes(actual as unknown as string | unknown[], item, getMsg(message));
    },
    toMatch(regex: RegExp, message?: string) {
      assertMatch(String(actual), regex, getMsg(message));
    },
    toBeGreaterThan(num: number, message?: string) {
      if (typeof actual !== 'number' || actual <= num) {
        throw new AssertionError(getMsg(message, `Expected ${actual} to be greater than ${num}`), actual, `> ${num}`);
      }
    },
    toBeGreaterThanOrEqual(num: number, message?: string) {
      if (typeof actual !== 'number' || actual < num) {
        throw new AssertionError(getMsg(message, `Expected ${actual} to be >= ${num}`), actual, `>= ${num}`);
      }
    },
    toBeLessThan(num: number, message?: string) {
      if (typeof actual !== 'number' || actual >= num) {
        throw new AssertionError(getMsg(message, `Expected ${actual} to be less than ${num}`), actual, `< ${num}`);
      }
    },
    toBeLessThanOrEqual(num: number, message?: string) {
      if (typeof actual !== 'number' || actual > num) {
        throw new AssertionError(getMsg(message, `Expected ${actual} to be <= ${num}`), actual, `<= ${num}`);
      }
    },
  };
}
