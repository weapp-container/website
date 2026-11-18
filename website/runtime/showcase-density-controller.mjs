import {isRenderScale, validRequestId} from '../shared/showcase-devices.mjs';

const revisionAdvanced = (current, previous) => {
  if (current === undefined || previous === undefined) return false;
  try { return BigInt(current) > BigInt(previous); }
  catch { return current > previous; }
};

function parseRequest(value) {
  if (!value || value.type !== 'showcase.render-scale.request' || value.schemaVersion !== 1
    || !validRequestId(value.requestId) || !isRenderScale(value.renderScale) || Object.keys(value).length !== 4
    || Object.keys(value).some(key => !['type', 'schemaVersion', 'requestId', 'renderScale'].includes(key))) {
    throw Object.assign(new Error('Invalid render scale request'), {code: 'ERR_SHOWCASE_RENDER_SCALE'});
  }
  return {requestId: value.requestId, renderScale: value.renderScale};
}

export function waitForRenderScalePresentation({getStatus, signal, schedule = requestAnimationFrame, cancel = cancelAnimationFrame, now = () => performance.now(), timeoutMs = 20000, afterRenderRevision}) {
  return new Promise((resolve, reject) => {
    const start = now(); let frame, previous, stable = 0, done = false;
    const finish = error => {
      if (done) return; done = true;
      if (frame !== undefined) cancel(frame);
      signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve();
    };
    const abort = () => finish(Object.assign(new Error('Showcase owner was closed'), {code: 'ERR_CANCELLED'}));
    const tick = () => {
      if (signal?.aborted) { abort(); return; }
      if (now() - start >= timeoutMs) { finish(Object.assign(new Error('新渲染密度没有及时显示'), {code: 'ERR_SHOWCASE_RENDER_SCALE_TIMEOUT'})); return; }
      const state = getStatus(), accepted = state?.presentation?.accepted;
      const revision = accepted?.proof?.publication?.renderRevision;
      if (state?.fault || state?.requiresRestart) { finish(Object.assign(new Error('演示运行库需要重新启动'), {code: state.fault?.code || 'ERR_SHOWCASE_RENDER_SCALE_RESTART'})); return; }
      const ready = state?.inputEnabled === true && accepted?.inputEnabled === true && revisionAdvanced(revision, afterRenderRevision);
      if (ready) stable = revision === previous ? stable + 1 : 1;
      else stable = 0;
      previous = ready ? revision : undefined;
      if (stable >= 2) finish(); else frame = schedule(tick);
    };
    signal?.addEventListener('abort', abort, {once: true});
    if (signal?.aborted) abort(); else frame = schedule(tick);
  });
}

export function createDensityController({initialScale = null, getSession, waitForPresentation, post, origin, source, onTransition = () => {}}) {
  let scale = isRenderScale(initialScale) ? initialScale : null, active = true, transaction = null;
  const seen = new Set();
  const reply = value => { if (active) post({type: 'showcase.render-scale.ack', schemaVersion: 1, ...value}); };
  return {
    get scale() { return scale; },
    get busy() { return transaction !== null; },
    close() { active = false; transaction?.abort(); transaction = null; },
    async receive(event) {
      if (!active || event.origin !== origin || event.source !== source || event.data?.type !== 'showcase.render-scale.request') return false;
      let request;
      try { request = parseRequest(event.data); }
      catch { if (validRequestId(event.data?.requestId)) reply({requestId: event.data.requestId, renderScale: event.data.renderScale ?? null, status: 'error', code: 'ERR_SHOWCASE_RENDER_SCALE'}); return false; }
      if (seen.has(request.requestId)) return false;
      if (seen.size >= 1024) { reply({requestId: request.requestId, renderScale: request.renderScale, status: 'error', code: 'ERR_SHOWCASE_RENDER_SCALE_RESTART'}); return false; }
      seen.add(request.requestId);
      const session = getSession();
      if (transaction || !session) { reply({requestId: request.requestId, renderScale: request.renderScale, status: 'error', code: 'ERR_SHOWCASE_RENDER_SCALE_BUSY'}); return false; }
      if (scale === request.renderScale) { reply({requestId: request.requestId, renderScale: scale, status: 'committed'}); return true; }
      const abort = new AbortController(); transaction = abort;
      const beforeRenderRevision = session.status?.presentation?.accepted?.proof?.publication?.renderRevision;
      try {
        onTransition(true);
        await session.setRenderScale(request.renderScale, {signal: abort.signal});
        await waitForPresentation({getStatus: () => session.status, signal: abort.signal, afterRenderRevision: beforeRenderRevision});
        if (!active || abort.signal.aborted) return false;
        scale = request.renderScale;
        reply({requestId: request.requestId, renderScale: scale, status: 'committed'});
        return true;
      } catch (error) {
        if (active && !abort.signal.aborted) reply({requestId: request.requestId, renderScale: request.renderScale, status: 'error', code: error.code || 'ERR_SHOWCASE_RENDER_SCALE'});
        return false;
      } finally {
        if (transaction === abort) { transaction = null; if (active) onTransition(false); }
      }
    },
  };
}
