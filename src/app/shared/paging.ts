/**
 * Process items in chunks of a given size, e.g. for loading cover art
 * page by page, until done or aborted.
 */
export async function paging<T, R>(
  items: T[],
  size: number,
  fn: (chunk: T[]) => Promise<R>,
  onResult: (result: R) => void,
  signal: AbortSignal,
): Promise<void> {
  for (let offset = 0; offset < items.length && !signal.aborted; offset += size) {
    const result = await fn(items.slice(offset, offset + size));
    if (!signal.aborted) {
      onResult(result);
    }
  }
}
