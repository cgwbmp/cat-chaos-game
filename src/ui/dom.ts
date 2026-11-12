// Tiny DOM helpers for the overlay; no UI framework.

type Child = Node | string | null | undefined | false;

interface Props {
  class?: string;
  text?: string;
  onClick?: (event: MouseEvent) => void;
  [attribute: string]: unknown;
}

/** Creates an element: `h('button', { class: 'big', onClick }, 'Play')`. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') element.className = String(value);
    else if (key === 'text') element.textContent = String(value);
    else if (key === 'onClick') element.addEventListener('click', value as EventListener);
    else element.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) element.append(child);
  }
  return element;
}

export function button(label: Child, onClick: () => void, props: Props = {}): HTMLButtonElement {
  return h('button', { type: 'button', ...props, onClick }, label);
}

export function coinIcon(): HTMLElement {
  return h('span', { class: 'coin', 'aria-hidden': 'true' });
}

const STAR_PATH = 'M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z';

export function starIcon(filled: boolean): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', filled ? 'star filled' : 'star');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', STAR_PATH);
  svg.append(path);
  return svg;
}

/** Three stars with an accessible label, e.g. "2 of 3 stars". */
export function starRow(stars: number): HTMLElement {
  const row = h('span', { class: 'stars', role: 'img', 'aria-label': `${stars} of 3 stars` });
  for (let index = 0; index < 3; index++) row.append(starIcon(index < stars));
  return row;
}

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled)';

/** Focuses the element marked `data-autofocus`, or the first control. */
export function focusFirst(root: HTMLElement): void {
  const target =
    root.querySelector<HTMLElement>('[data-autofocus]') ??
    root.querySelector<HTMLElement>(FOCUSABLE);
  target?.focus({ preventScroll: true });
}

/** Moves focus to the next or previous control inside `root` (arrow-key navigation). */
export function moveFocus(root: HTMLElement, step: 1 | -1): void {
  const controls = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (control) => control.offsetParent !== null,
  );
  if (controls.length === 0) return;
  const current = controls.indexOf(document.activeElement as HTMLElement);
  const next = current === -1 ? 0 : (current + step + controls.length) % controls.length;
  controls[next]?.focus({ preventScroll: true });
}
