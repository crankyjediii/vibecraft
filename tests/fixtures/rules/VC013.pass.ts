export function safeParse(raw: string): { ok: boolean; error?: string } {
  try {
    JSON.parse(raw);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
