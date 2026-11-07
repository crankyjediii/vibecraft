export function unsafeParse(raw: string): void {
  try {
    JSON.parse(raw);
  } catch (err) {
  }
}
