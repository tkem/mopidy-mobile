/**
 * DOM helpers for component tests.
 *
 * Ionic's (Stencil) scoped components patch `textContent` on their host
 * elements, so text is collected from the DOM text nodes directly.
 */

/** Get the text content of an element, with surrounding whitespace removed. */
export function textOf(node: Node | null | undefined): string {
  if (!node) {
    return '';
  }
  const walker = node.ownerDocument!.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) {
    parts.push(walker.currentNode.textContent || '');
  }
  return parts.join('').trim();
}

/** Get the text content of all elements matching a selector. */
export function textsOf(root: ParentNode, selector: string): string[] {
  return Array.from(root.querySelectorAll(selector)).map((el) => textOf(el));
}

/** Dispatch a bubbling click event on an element. */
export function click(el: Element | null | undefined): void {
  if (!el) {
    throw new Error('Element not found');
  }
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

/** Dispatch a bubbling custom event, e.g. an Ionic "ionChange" event. */
export function dispatch(el: Element | null | undefined, name: string, detail?: unknown): void {
  if (!el) {
    throw new Error('Element not found');
  }
  el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
}

/** Wait for pending promises and Ionic component rendering. */
export function flush(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
