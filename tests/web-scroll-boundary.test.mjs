import test from 'node:test';
import assert from 'node:assert/strict';
import {attachShowcaseScrollBoundary} from '../website/shared/showcase-scroll-boundary.mjs';

function screen() {
  const listeners = new Set(), registrations = [], removals = [];
  const root = {
    contains: element => element.inside !== false,
    addEventListener(type, listener, options) { registrations.push({type, options}); listeners.add(listener); },
    removeEventListener(type, listener, options) { removals.push({type, options}); listeners.delete(listener); },
  };
  return {root, registrations, removals, wheel(values = {}) {
    const event = {cancelable:true, defaultPrevented:false, deltaX:0, deltaY:100,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { assert.fail('The guest must still receive wheel events'); }, ...values};
    for (const listener of listeners) listener(event);
    return event;
  }};
}

test('the boundary uses a non-passive listener, preserves zoom and releases on unmount', () => {
  const h = screen(), detach = attachShowcaseScrollBoundary(h.root);
  assert.deepEqual(h.registrations, [{type:'wheel', options:{passive:false}}]);
  assert.equal(h.wheel().defaultPrevented, true);
  assert.equal(h.wheel({ctrlKey:true}).defaultPrevented, false, 'browser zoom');
  assert.equal(h.wheel({cancelable:false}).defaultPrevented, false);
  assert.equal(h.wheel({defaultPrevented:true, preventDefault:() => assert.fail('already cancelled')}).defaultPrevented, true);
  detach(); detach();
  assert.equal(h.removals.length, 1);
  assert.equal(h.removals[0].options, h.registrations[0].options);
  assert.equal(h.wheel().defaultPrevented, false, 'unmount/pagehide removes the listener');
  const again = attachShowcaseScrollBoundary(h.root);
  assert.equal(h.wheel().defaultPrevented, true, 'React effect can remount');
  again();
});

test('native editors scroll internally and contain both directions at their edges', () => {
  const h = screen(), dialog = {scrollHeight:300, clientHeight:300, scrollTop:0, overflowY:'auto'};
  const field = {nodeType:1, scrollHeight:500, clientHeight:100, scrollTop:100,
    scrollWidth:400, clientWidth:100, scrollLeft:100, overflowY:'auto', overflowX:'auto',
    closest: selector => selector === 'dialog[open]' ? dialog : null, parentElement:dialog};
  const ownerDocument = {defaultView:{getComputedStyle:element => element}};
  field.ownerDocument = dialog.ownerDocument = ownerDocument;
  const detach = attachShowcaseScrollBoundary(h.root, {nativeScroll:'dialog[open]'});
  const wheel = values => h.wheel({target:field, ...values}).defaultPrevented;
  assert.equal(wheel({deltaY:50}), false);
  assert.equal(wheel({deltaY:-50}), false);
  field.scrollTop = 0;
  assert.equal(wheel({deltaY:-50}), true);
  assert.equal(wheel({deltaY:50}), false);
  field.scrollTop = 400;
  assert.equal(wheel({deltaY:50}), true);
  assert.equal(wheel({deltaX:50,deltaY:0}), false);
  field.scrollLeft = 300;
  assert.equal(wheel({deltaX:50,deltaY:0}), true);
  field.scrollLeft = 0;
  assert.equal(wheel({deltaX:-50,deltaY:0}), true);
  // A full field can still hand scrolling to its enclosing native dialog.
  dialog.scrollHeight = 600; dialog.scrollTop = 50;
  assert.equal(wheel({deltaY:50}), false);
  dialog.scrollTop = 300;
  assert.equal(wheel({deltaY:50}), true);
  dialog.inside = false;
  field.scrollTop = 100;
  assert.equal(wheel({deltaY:50}), true, 'foreign native roots do not bypass the boundary');
  detach();
});
