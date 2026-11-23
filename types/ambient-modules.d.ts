/**
 * Ambient declarations for modules that ship without TypeScript types.
 *
 * Kept deliberately small and limited to what this repository actually imports.
 * These are *declarations*, not error suppressions: no `@ts-ignore`,
 * `@ts-expect-error` or `@ts-nocheck` is used anywhere in this file.
 */

/**
 * `bun test` runtime. The package is installed by the Bun toolchain at test
 * time and has no type declarations in `node_modules`, so the surface that the
 * unit suites use is declared here.
 */
declare module "bun:test" {
  export interface Matchers {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toStrictEqual(expected: unknown): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toBeNaN(): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toBeCloseTo(expected: number, precision?: number): void;
    toBeInstanceOf(expected: unknown): void;
    toContain(expected: unknown): void;
    toContainEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
    toHaveProperty(path: string, value?: unknown): void;
    toMatch(expected: string | RegExp): void;
    toMatchObject(expected: object): void;
    toThrow(expected?: unknown): void;
    toThrowError(expected?: unknown): void;
    toHaveBeenCalled(): void;
    toHaveBeenCalledTimes(expected: number): void;
    toHaveBeenCalledWith(...args: unknown[]): void;
    readonly not: Matchers;
    readonly resolves: Matchers;
    readonly rejects: Matchers;
  }

  export function describe(name: string, fn: () => void | Promise<void>): void;
  export function describe(fn: () => void | Promise<void>): void;
  export function it(name: string, fn: () => void | Promise<void>, timeout?: number): void;
  export function it(fn: () => void | Promise<void>, timeout?: number): void;
  export function test(name: string, fn: () => void | Promise<void>, timeout?: number): void;
  export function test(fn: () => void | Promise<void>, timeout?: number): void;
  export function expect(actual: unknown): Matchers;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
}

/**
 * `cvss` v1 ships plain JavaScript with no definitions and no `@types/cvss`
 * release exists. TS7016 explicitly recommends this declaration as the fix.
 */
declare module "cvss";
