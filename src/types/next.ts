export type ServerSearchParams<T extends Record<string, unknown> = {}> =
  Promise<Partial<{ [K in keyof T]: string | string[] | undefined }>>

