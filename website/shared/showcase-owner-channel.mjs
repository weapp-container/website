import {validRequestId} from './showcase-devices.mjs';

// Each wait belongs to one immutable iframe Window and one request ID. Once
// retired, it cannot consume a late reply or hand authority to a replacement.
export function requestShowcaseOwner({owner,payload,origin,currentOwner,subscribe,post,accepts,signal,timeoutMs = 25000,schedule = setTimeout,cancel = clearTimeout}) {
  return new Promise((resolve,reject) => {
    if (!owner || payload?.schemaVersion !== 1 || !validRequestId(payload.requestId)) { reject(new Error('Invalid owner request')); return; }
    let done = false, timer, unsubscribe;
    const finish = (error,value) => {
      if (done) return; done = true;
      if (timer !== undefined) cancel(timer);
      unsubscribe?.(); signal?.removeEventListener('abort',abort);
      if (error) reject(error); else resolve(value);
    };
    const abort = () => finish(Object.assign(new Error('演示页面已关闭。'),{code:'ERR_CANCELLED'}));
    const receive = event => {
      if (done || event.origin !== origin || event.source !== owner || currentOwner() !== owner || event.data?.schemaVersion !== 1 || event.data.requestId !== payload.requestId) return;
      if (accepts(event.data)) finish(null,event.data);
    };
    if (signal?.aborted) { abort(); return; }
    unsubscribe = subscribe(receive);
    signal?.addEventListener('abort',abort,{once:true});
    timer = schedule(() => finish(Object.assign(new Error('设备切换未完成，请重新加载演示。'),{code:'ERR_SHOWCASE_DEVICE_TIMEOUT'})),timeoutMs);
    try { post(owner,payload,origin); } catch (error) { finish(error); }
  });
}
