// Build with fontkit@2.0.4 and esbuild. pdf-lib's old fontkit fork loses
// composite glyphs from Pretendard; use the current subset encoder instead.
import { create as createFont } from 'fontkit';
export function create(bytes) {
  const font = createFont(bytes);
  const createSubset = font.createSubset.bind(font);
  font.createSubset = () => {
    const subset = createSubset();
    // pdf-lib 1.17 expects the old event-based interface. fontkit 2 returns
    // encoded bytes synchronously; this adapter changes only the interface.
    subset.encodeStream = () => {
      const handlers = {};
      queueMicrotask(() => {
        try { handlers.data(subset.encode()); handlers.end(); }
        catch (error) { handlers.error(error); }
      });
      return { on(event, handler) { handlers[event] = handler; return this; } };
    };
    return subset;
  };
  return font;
}
