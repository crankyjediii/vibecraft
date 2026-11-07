// Safari evicts non-persistent OPFS handles after 7 idle days
export function persistOrigin(): boolean {
  return true;
}
