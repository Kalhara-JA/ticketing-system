declare module "vitest" {
  export const describe: any;
  export const it: any;
  export const expect: any;
  export const beforeEach: any;
  export const vi: any;
}

declare module "vitest/config" {
  export function defineConfig(config: any): any;
}


