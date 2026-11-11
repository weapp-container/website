// A metrics RPC acknowledges the native transaction. A device switch becomes
// visible only when its viewport has an accepted picture and input is unfenced.
export function waitForDevicePresentation({getStatus,geometry,signal,schedule = requestAnimationFrame,cancel = cancelAnimationFrame,now = () => performance.now(),timeoutMs = 20000,revision}) {
  return new Promise((resolve,reject) => {
    const start = now(); let frame, previous, stable = 0, done = false;
    const finish = error => {
      if (done) return; done = true;
      if (frame !== undefined) cancel(frame);
      signal?.removeEventListener('abort',abort);
      if (error) reject(error); else resolve();
    };
    const abort = () => finish(Object.assign(new Error('Device owner was closed'),{code:'ERR_CANCELLED'}));
    const tick = () => {
      if (signal?.aborted) { abort(); return; }
      if (now()-start >= timeoutMs) { finish(Object.assign(new Error('Device viewport was not presented'),{code:'ERR_SHOWCASE_DEVICE_TIMEOUT'})); return; }
      const state = getStatus(), viewport = state?.observation?.state?.viewport;
      if (state?.fault || state?.requiresRestart) { finish(Object.assign(new Error('Device owner requires a restart'),{code:state.fault?.code || 'ERR_SHOWCASE_DEVICE_RESTART'})); return; }
      const accepted = state?.presentation?.accepted, picture = accepted?.proof?.consumedInput?.viewport;
      const matches = value => value?.width === geometry.viewport.width && value?.height === geometry.viewport.height;
      const expected=geometry.metrics;
      const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
      const metricsMatch=!expected||canonical(state?.windowMetrics)===canonical(expected);
      const transactionMatch=revision===undefined||state?.metricsFence?.revision===revision;
      const ready = metricsMatch && transactionMatch && state?.inputEnabled === true && state.metricsFence?.phase === 'open' && accepted?.inputEnabled === true && matches(viewport) && matches(picture);
      const sequence = state?.observation?.sequence;
      if (ready && sequence !== undefined) stable = sequence === previous ? stable+1 : 1;
      else stable = 0;
      previous = ready ? sequence : undefined;
      if (stable >= 2) finish(); else frame = schedule(tick);
    };
    signal?.addEventListener('abort',abort,{once:true});
    if (signal?.aborted) abort(); else frame = schedule(tick);
  });
}
