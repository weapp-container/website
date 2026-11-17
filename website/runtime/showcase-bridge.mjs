const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const MAX_STATE_BYTES = 128 * 1024;
const validIdentity = value => record(value) && value.protocolVersion === 1 && typeof value.sessionId === 'string' && value.sessionId.length <= 128;
const validText = value => validIdentity(value) && ['string','number'].includes(typeof value.pageId) && typeof value.requestId === 'string' && value.requestId.length <= 128
  && ['search','address.name','address.phone','address.detail','food.note','basic'].includes(value.field)
  && typeof value.title === 'string' && value.title.length <= 80 && typeof value.value === 'string'
  && Number.isInteger(value.maxLength) && value.maxLength > 0 && value.maxLength <= 1000 && value.value.length <= value.maxLength;
export function createShowcaseBridge({send,readState,writeState,showText,hideText,onReady = () => {},onError = () => {},onClose = () => {}}) {
  let sessionId = null, pending = null, pendingScene = null, closed = false, closeRequested = false;
  const same = value => value.sessionId === sessionId && pending && ['requestId','pageId'].every(key => value[key] === pending[key]);
  const dismiss = () => { pending = null; hideText(); };
  const reply = (request,type,extra = {}) => send({type,protocolVersion:1,sessionId:request.sessionId,pageId:request.pageId,requestId:request.requestId,...extra});
  return {
    async receive(value) {
      if (closed || !validIdentity(value)) return false;
      if (value.type === 'showcase.state.ready') {
        if (sessionId === value.sessionId) return true;
        dismiss(); sessionId = value.sessionId; closeRequested = false;
        let state = null;
        try { const raw = readState(); if (typeof raw === 'string' && new TextEncoder().encode(raw).length <= MAX_STATE_BYTES) { const parsed = JSON.parse(raw); if (record(parsed) && parsed.schemaVersion === 1) state = parsed; } } catch { state = null; }
        await send({type:'showcase.state.restore',protocolVersion:1,sessionId,state}); if (!closed && sessionId === value.sessionId) onReady(); return true;
      }
      if (value.sessionId !== sessionId) return false;
      if (value.type === 'showcase.state.changed') {
        if (!record(value.state) || value.state.schemaVersion !== 1) return false;
        const raw = JSON.stringify(value.state);
        if (new TextEncoder().encode(raw).length > MAX_STATE_BYTES) return false;
        try { writeState(raw); } catch(error) { onError(Object.assign(new Error('演示状态保存失败'),{code:'ERR_STORAGE',cause:error})); }
        return true;
      }
      if (value.type === 'showcase.scene.ack') {
        if (!pendingScene || value.requestId !== pendingScene.requestId || value.scene !== pendingScene.scene || !['committed','error'].includes(value.status)) return false;
        const operation = pendingScene; pendingScene = null;
        clearTimeout(operation.timer);
        if (value.status === 'committed') operation.resolve(value);
        else operation.reject(Object.assign(new Error('小程序场景切换失败'),{code:value.code || 'ERR_SHOWCASE_SCENE'}));
        return true;
      }
      if (value.type === 'showcase.close.request') { if(closeRequested)return false; closeRequested=true; dismiss(); onClose(); return true; }
      if (value.type === 'showcase.text.request' && validText(value)) {
        dismiss(); pending = structuredClone(value); showText(pending); return true;
      }
      if (value.type === 'showcase.text.dismiss' && same(value)) { dismiss(); return true; }
      return false;
    },
    async commit(value) {
      if (closed || !pending || typeof value !== 'string') return false;
      const request = pending; dismiss();
      await reply(request,'showcase.text.commit',{value:value.slice(0,request.maxLength)}); return true;
    },
    async cancel() { if (closed || !pending) return false; const request = pending; dismiss(); await reply(request,'showcase.text.cancel'); return true; },
    requestScene(scene,requestId,timeoutMs = 8000) {
      if (closed || !sessionId) return Promise.reject(Object.assign(new Error('小程序场景尚未就绪'),{code:'ERR_SHOWCASE_SCENE_NOT_READY'}));
      if (pendingScene) return Promise.reject(Object.assign(new Error('已有场景切换正在进行'),{code:'ERR_SHOWCASE_SCENE_BUSY'}));
      if (!['basic','shop','order'].includes(scene) || typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,96}$/.test(requestId)) return Promise.reject(Object.assign(new Error('无效的场景请求'),{code:'ERR_SHOWCASE_SCENE'}));
      return new Promise((resolve,reject)=>{
        const operation={scene,requestId,resolve,reject,timer:setTimeout(()=>{if(pendingScene!==operation)return;pendingScene=null;reject(Object.assign(new Error('小程序未确认场景切换'),{code:'ERR_SHOWCASE_SCENE_TIMEOUT'}))},timeoutMs)};
        pendingScene=operation;
        Promise.resolve(send({type:'showcase.scene.request',protocolVersion:1,sessionId,requestId,scene})).catch(error=>{
          if(pendingScene===operation){pendingScene=null;clearTimeout(operation.timer);reject(error)}
        });
      });
    },
    close() { if (closed) return; closed = true; sessionId = null; dismiss(); if(pendingScene){clearTimeout(pendingScene.timer);pendingScene.reject(Object.assign(new Error('Showcase owner was closed'),{code:'ERR_CANCELLED'}));pendingScene=null;} },
  };
}
