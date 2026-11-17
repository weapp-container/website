import test from 'node:test';
import assert from 'node:assert/strict';
import {siteReferences} from '../site-html.mjs';

test('site links come from HTML attributes and exclude code, comments and scripts', () => {
  const {links, ids} = siteReferences(`<pre><code>&lt;import src="..." /&gt;</code></pre>
    <!-- <a href="comment"> -->
    <script>const example = '<img src="script">';</script>
    <a id='section' href='/docs/?x=1&amp;y=2'>Reference</a>
    <img src=/logo.svg><template><a href="#section">Nested</a></template>`);
  assert.deepEqual(links, ['/docs/?x=1&y=2', '/logo.svg', '#section']);
  assert.deepEqual([...ids], ['section']);
});
