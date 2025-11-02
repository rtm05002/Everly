export const has = <T extends object, K extends keyof T>(
  obj: T | undefined | null,
  key: K
): obj is T & Required<Pick<T, K>> => !!obj && obj[key] !== undefined && obj[key] !== null

