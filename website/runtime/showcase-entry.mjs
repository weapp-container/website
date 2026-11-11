import { WorkerWebSession } from './worker-web-session.mjs';
import { WORKER_PRODUCT_CONFIG } from './worker-product-config.mjs';
import { SHOWCASE_CONFIG } from './showcase-config.mjs';
import { createShowcaseBridge } from './showcase-bridge.mjs';
import {parseDeviceSelection,deviceGeometry,validRequestId} from '../shared/showcase-devices.mjs';
import {createDeviceController} from './showcase-device-controller.mjs';
import {waitForDevicePresentation} from './showcase-presentation.mjs';
import {createSceneController,waitForScenePresentation} from './showcase-scene-controller.mjs';
import {attachShowcaseScrollBoundary} from '../shared/showcase-scroll-boundary.mjs';

// The screen owns browser scrolling for the document's lifetime, including
// startup, errors and the closed state before React retires this iframe.
const releaseScrollBoundary = attachShowcaseScrollBoundary(document.documentElement, {nativeScroll: 'dialog[open]'});
const startup = document.querySelector('#startup');
const dialog = document.querySelector('#text-dialog');
const field = document.querySelector('#text-value');
const notify = (state,requestId) => {
  document.documentElement.dataset.state = state;
  if (parent !== window) parent.postMessage({type:'showcase.status',schemaVersion:1,state,...(requestId ? {requestId} : {})}, location.origin);
};
const fail = error => {
  if (closing || closed) return;
  startup.hidden = false;
  startup.textContent = `演示暂时无法运行（${error.code || 'ERR_RUNTIME'}）。请返回后重新打开。`;
  notify('error');
  console.error('Showcase runtime failed', error);
};
let loaded = false, restored = false, restoreDrained = false, closed = false, closing = false, draining = null, timer = null, closePromise = null, readyFrame = null;
const {scene,selection:initialSelection} = (() => {
  try { return parseDeviceSelection(location.search); }
  catch (error) { fail(error); throw error; }
})();
const applyGeometry = geometry => {
  const root = document.documentElement;
  root.style.setProperty('--viewport-width',`${geometry.viewport.width}px`);
  root.style.setProperty('--viewport-height',`${geometry.viewport.height}px`);
  const pane=geometry.usable,dialogWidth=Math.min(340,Math.max(0,pane.width-36)),dialogHeight=Math.max(0,pane.height-36);
  root.style.setProperty('--dialog-x',`${pane.x+(pane.width-dialogWidth)/2}px`);
  root.style.setProperty('--dialog-y',`${pane.y+pane.height/2}px`);
  root.style.setProperty('--dialog-width',`${dialogWidth}px`);
  root.style.setProperty('--dialog-max-height',`${dialogHeight}px`);
  Object.assign(root.dataset,{device:geometry.selection.device,display:geometry.selection.display,rotation:String(geometry.selection.rotation),viewportWidth:String(geometry.viewport.width),viewportHeight:String(geometry.viewport.height)});
};
const initialGeometry = deviceGeometry(initialSelection);
applyGeometry(initialGeometry);
document.documentElement.dataset.scene=scene;
let session;
let closeRequestId, closeAcknowledged = false;
const deviceController = createDeviceController({
  initialSelection,getSession: () => loaded && !closing && !closed ? session : null,
  applyGeometry,
  waitForPresentation: (geometry,signal,{revision}) => waitForDevicePresentation({getStatus: () => session.status,geometry,signal,revision}),
  post: value => parent.postMessage(value,location.origin),origin:location.origin,source:parent,
  onTransition: switching => { document.documentElement.dataset.deviceSwitching = String(switching); },
});
const publishReady = () => {
  if (readyFrame !== null) cancelAnimationFrame(readyFrame);
  readyFrame = null;
  if (startup.hidden || closing || closed || !loaded || !restored || !restoreDrained || session?.status.inputEnabled !== true || !session.status.presentation?.accepted) return;
  const sequence = session.status.observation?.sequence;
  // State restoration may enqueue a guest setData flush after its RPC final.
  // Wait for the following native queue drain and a stable accepted picture.
  readyFrame = requestAnimationFrame(() => { readyFrame = requestAnimationFrame(() => {
    readyFrame = null;
    if (!closing && !closed && session.status.inputEnabled === true && sequence === session.status.observation?.sequence) { startup.hidden = true; notify('ready'); }
  }); });
};
const send = async payload => {
  if (!loaded || closed) throw Object.assign(new Error('Showcase owner is closed'),{code:'ERR_CANCELLED'});
  return session.request('host.message', payload);
};
const bridge = createShowcaseBridge({
  send,
  readState: () => { try { return localStorage.getItem('weapp-container-showcase-state-v1'); } catch { return null; } },
  writeState: value => { localStorage.setItem('weapp-container-showcase-state-v1',value); },
  showText(request) {
    if (dialog.open) dialog.close();
    document.querySelector('#text-title').textContent = request.title;
    field.value = request.value; field.maxLength = request.maxLength;
    field.rows = request.multiline ? 4 : 2;
    dialog.showModal(); field.focus(); field.setSelectionRange(field.value.length,field.value.length);
  },
  hideText() { if (dialog.open) dialog.close(); },
  onReady() { restored = true; publishReady(); },
  onError: fail,
  onClose: () => { queueMicrotask(() => { void close().catch(fail); }); },
});
const sceneController = createSceneController({
  initialScene:scene,getSession:()=>loaded&&!closing&&!closed?session:null,getBridge:()=>bridge,
  waitForPresentation:options=>waitForScenePresentation(options),
  post:value=>parent.postMessage(value,location.origin),origin:location.origin,source:parent,
  setScene:value=>{document.documentElement.dataset.scene=value;},
  onTransition:switching=>{document.documentElement.dataset.sceneSwitching=String(switching);},
});
async function drain(final = false) {
  if (!loaded || closed || closing && !final || draining) return draining;
  const wasRestored = restored,started=performance.now();let requestCount=0;
  draining = session.nativeHostServices('native.take').then(async ({requests}) => {
    requestCount=requests.length;
    for (const request of requests) {
      if (closed) break;
      if (request.kind === 'message') await bridge.receive(request.payload);
      else if (request.kind === 'call') await session.nativeHostServices('native.complete',{callId:request.callId,completion:{error:{code:'unsupported',message:'This host capability is unavailable in Showcase',retryable:false}}});
    }
  }).catch(error => { if (!closed) fail(error); }).finally(() => {
    const measurements=window.__showcaseSmokeMetrics;
    if(measurements){measurements.hostQueueDrains.push({durationMs:performance.now()-started,requestCount});if(measurements.hostQueueDrains.length>500)measurements.hostQueueDrains.shift();}
    draining = null; if (wasRestored) restoreDrained = true; publishReady();
  });
  return draining;
}
const close = requestId => {
  if (requestId) closeRequestId = requestId;
  if (closePromise) return closePromise;
  closing = true; clearInterval(timer); timer = null;
  deviceController.close(); sceneController.close();
  if (readyFrame !== null) cancelAnimationFrame(readyFrame); readyFrame = null;
  closePromise = (async () => {
    await draining;
    await drain(true);
    closed = true; loaded = false; bridge.close();
    const result = await session?.close();
    if (result && (result.closed !== true || result.workerClosed !== true)) throw Error('Runtime did not acknowledge shutdown');
    closeAcknowledged = true;
    notify('closed',closeRequestId);
  })();
  return closePromise;
};
document.querySelector('#text-commit').addEventListener('click',() => { void bridge.commit(field.value).catch(fail); });
field.addEventListener('keydown',event => { if (event.key === 'Enter' && !event.isComposing && (field.rows === 2 || event.ctrlKey || event.metaKey)) { event.preventDefault(); void bridge.commit(field.value).catch(fail); } });
document.querySelector('#text-cancel').addEventListener('click',() => { void bridge.cancel().catch(fail); });
dialog.addEventListener('cancel',event => { event.preventDefault(); void bridge.cancel().catch(fail); });
window.addEventListener('message',event => {
  if (event.origin !== location.origin || event.source !== parent) return;
  if (event.data?.type === 'showcase.scene.request') { void sceneController.receive(event); return; }
  if (event.data?.type === 'showcase.device.request') { void deviceController.receive(event); return; }
  const value = event.data;
  if (value?.type === 'showcase.close' && value.schemaVersion === 1 && validRequestId(value.requestId) && Object.keys(value).length === 3) {
    if (closeAcknowledged) notify('closed',value.requestId);
    else void close(value.requestId).catch(fail);
  }
});
window.addEventListener('pagehide',() => { releaseScrollBoundary(); void close().catch(fail); },{once:true});
try {
  notify('loading');
  session = new WorkerWebSession({surfaceRoot:document.querySelector('#surface-root'),
    onBatch: () => { void drain(); },
    onState: state => {
      document.documentElement.dataset.inputEnabled = state.inputEnabled === true ? 'true' : 'false';
      const measurements=window.__showcaseSmokeMetrics;
      if(measurements&&state.presentation?.accepted){measurements.acceptedFrames.push({at:performance.now(),sequence:state.observation?.sequence,inputEnabled:state.inputEnabled===true});if(measurements.acceptedFrames.length>500)measurements.acceptedFrames.shift();}
      if (state.fault) { fail(state.fault); return; }
      if (!closing && !state.presentation?.accepted && state.presentation?.failed?.error) { fail(state.presentation.failed.error); return; }
      publishReady();
    }, onError: fail,
  });
  const {index,rendererPolicy,rendererAssets} = WORKER_PRODUCT_CONFIG;
  await session.load({engine:'quickjs',indexUrl:index.url,indexSha256:index.sha256,indexSize:index.size,
    engineExecution:{bootstrapTimeoutMs:10000,turnTimeoutMs:1000},
    viewExecution:{batchTimeoutMs:500},
    loadTimeoutMs:120000,
    viewport:initialGeometry.viewport,rendererPolicy,rendererAssets,renderScale:'auto',query:{scene},
    metrics:initialGeometry.metrics,
    hostServices:{application:{hostAppId:'dev.weapp.container.showcase.web',tenantId:'showcase',publisherId:'weapp-container',appId:'showcase',environment:'trial',version:SHOWCASE_CONFIG.runtimeVersion,packRoot:SHOWCASE_CONFIG.packRoot},account:{principalId:null,epoch:'1'},apis:[]},
  });
  if (closing) await close();
  else { loaded = true; await drain(); timer = setInterval(() => { void drain(); },80); }
} catch(error) { if (!closing) fail(error); await close().catch(cleanup => console.error('Showcase cleanup failed',cleanup)); }
