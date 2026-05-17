import { JSDOM } from 'jsdom';

let mermaidModule = null;

/**
 * Sets up the global DOM environment required by mermaid in Node.js,
 * then dynamically imports mermaid (its DOMPurify dependency reads
 * globalThis.window at import time in ESM mode).
 */
async function ensureInitialized() {
  if (mermaidModule) return;

  // Create a jsdom instance for the server-side DOM
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
  });
  const vm = dom.window;

  // Expose globals that mermaid and DOMPurify expect
  Object.defineProperty(globalThis, 'document', {
    value: vm.document,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: vm,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: vm.navigator,
    writable: true,
    configurable: true,
  });

  // Polyfill CSSStyleSheet (used by mermaid's CSS handling)
  class MockCSSStyleSheet {
    constructor() {
      this.rules = [];
      this.cssRules = [];
    }
    replaceSync() {}
    replace() {
      return Promise.resolve(this);
    }
    insertRule() {
      return 0;
    }
    deleteRule() {}
  }
  Object.defineProperty(globalThis, 'CSSStyleSheet', {
    value: MockCSSStyleSheet,
    writable: true,
    configurable: true,
  });

  // Polyfill getBBox on SVGElement (jsdom does not implement SVG layout).
  // A realistic bounding box is needed for edge labels and node sizing;
  // returning { x: 0, y: 0 } causes "Could not find a suitable point"
  // errors in mermaid's edge routing.
  const svgEl = vm.document.createElementNS(
    'http://www.w3.org/2000/svg',
    'text'
  );
  const svgProto = Object.getPrototypeOf(svgEl);
  svgProto.getBBox = function () {
    const text = this.textContent || '';
    return {
      x: 0,
      y: -12,
      width: Math.max(text.length * 7, 20),
      height: 16,
    };
  };

  // Dynamic import so mermaid sees the globals we just set
  mermaidModule = await import('mermaid');
  mermaidModule.default.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'default',
  });
}

/**
 * Renders a Mermaid diagram definition to an SVG string at build time.
 * This eliminates the need for client-side Mermaid JS.
 *
 * @param {string} code - The Mermaid diagram definition (e.g. "flowchart TD ...")
 * @returns {Promise<string>} The rendered SVG markup, or a fallback error div
 */
export async function renderMermaidDiagram(code) {
  try {
    await ensureInitialized();
    const id = `mermaid-svg-${Math.random().toString(36).slice(2, 9)}`;
    const { svg } = await mermaidModule.default.render(id, code);
    return svg;
  } catch (error) {
    return `<div class="mermaid-error" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:1.25rem;color:#dc2626;">Mermaid render error: ${error.message}</div>`;
  }
}
