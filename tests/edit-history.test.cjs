const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../edit-history.js');

test('groups typing but separates fields, pauses and structural changes',()=>{
  const h=createEditHistory({name:''});
  h.record({name:'a'},'name',1000);
  h.record({name:'ab'},'name',1100);
  h.record({name:'abc'},'name',2000);
  assert.deepEqual(h.undo(),{name:'ab'});
  assert.deepEqual(h.undo(),{name:''});
  assert.deepEqual(h.redo(),{name:'ab'});
  h.record({name:'ab',items:[1]});
  assert.equal(h.canRedo,false);
  assert.deepEqual(h.undo(),{name:'ab'});
});

test('restores deleted items, ordering and full document replacement',()=>{
  const original={items:[{id:1},{id:2}],order:['a','b']};
  const h=createEditHistory(original);
  h.record({items:[{id:2}],order:['a','b']});
  h.record({items:[{id:2}],order:['b','a']});
  h.record({items:[],order:[]});
  assert.deepEqual(h.undo(),{items:[{id:2}],order:['b','a']});
  h.undo();
  assert.deepEqual(h.undo(),original);
  assert.equal(h.undo(),null);
});

test('limits history and isolates stored snapshots from mutable state',()=>{
  const value={items:[]},h=createEditHistory(value,2);
  value.items.push(1);h.record(value);
  value.items.push(2);h.record(value);
  value.items.push(3);h.record(value);
  assert.deepEqual(h.undo(),{items:[1,2]});
  assert.deepEqual(h.undo(),{items:[1]});
  assert.equal(h.canUndo,false);
  assert.deepEqual(h.redo(),{items:[1,2]});
});
