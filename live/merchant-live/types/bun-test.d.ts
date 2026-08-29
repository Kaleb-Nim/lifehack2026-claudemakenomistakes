// Minimal ambient declaration for `bun:test`, used by the MERCH-03 test files
// (lib/source-matcher.test.ts, app/api/upload/route.test.ts).
//
// The real types ship in the `bun-types` / `@types/bun` package, but adding that as a
// devDependency would touch a second line of package.json — MERCH-03's brief keeps that file's
// diff to a single line (the pdfjs-dist dependency). `bun test` itself doesn't need this file at
// all (it resolves `bun:test` natively at runtime); this shim exists purely so `bunx tsc --noEmit`
// has something to resolve the import against.
declare module "bun:test" {
  // Chainable so `.not`, `.rejects` and `.resolves` typecheck. The original
  // shim returned a flat record, which meant any chained matcher failed
  // `tsc --noEmit` even though `bun test` ran it fine — the intersection keeps
  // arbitrary matcher names resolving while giving the three modifiers a type.
  type Matchers = {
    not: Matchers;
    rejects: Matchers;
    resolves: Matchers;
  } & Record<string, (...args: unknown[]) => unknown>;

  export const describe: (name: string, fn: () => void | Promise<void>) => void;
  export const test: (name: string, fn: () => void | Promise<void>) => void;
  export const it: typeof test;
  export const expect: (actual: unknown) => Matchers;
  export const beforeAll: (fn: () => void | Promise<void>) => void;
  export const afterAll: (fn: () => void | Promise<void>) => void;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;
}
