export function parseJson(raw: string): unknown {
  return JSON.parse(raw) as any;
}
