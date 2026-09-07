// In-memory snapshots only: history never adds another copy to localStorage.
globalThis.createEditHistory = function(initial, limit = 60) {
  let current = JSON.stringify(initial);
  const past = [], future = [];
  let lastGroup = null, lastTime = 0;
  return {
    record(value, group = null, now = Date.now()) {
      const next = JSON.stringify(value);
      if (next === current) return;
      if (!group || group !== lastGroup || now - lastTime > 700 || future.length) {
        past.push(current);
        if (past.length > limit) past.shift();
      }
      current = next;
      future.length = 0;
      lastGroup = group;
      lastTime = now;
    },
    undo() {
      if (!past.length) return null;
      future.push(current);
      current = past.pop();
      lastGroup = null;
      return JSON.parse(current);
    },
    redo() {
      if (!future.length) return null;
      past.push(current);
      current = future.pop();
      lastGroup = null;
      return JSON.parse(current);
    },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; }
  };
};
