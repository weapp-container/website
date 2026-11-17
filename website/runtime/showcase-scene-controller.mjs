import {validRequestId} from '../shared/showcase-devices.mjs';

const scenes = new Set(['basic','shop','order']);
const sequenceAdvanced = (current, previous) => {
  if (current === undefined || previous === undefined) return false;
  try { return BigInt(current) > BigInt(previous); }
  catch { return current > previous; }
};

export function waitForScenePresentation({getStatus,signal,schedule = requestAnimationFrame,cancel = cancelAnimationFrame,now = () => performance.now(),timeoutMs = 12000,afterSequence}) {
  return new Promise((resolve,reject) => {
    const start = now(); let frame, previous, stable = 0, done = false;
    const finish = error => {
      if (done) return; done = true;
      if (frame !== undefined) cancel(frame);
      signal?.removeEventListener('abort',abort);
      if (error) reject(error); else resolve();
    };
    const abort = () => finish(Object.assign(new Error('Showcase owner was closed'),{code:'ERR_CANCELLED'}));
    const tick = () => {
      if (signal?.aborted) { abort(); return; }
      if (now()-start >= timeoutMs) { finish(Object.assign(new Error('新场景没有及时显示'),{code:'ERR_SHOWCASE_SCENE_TIMEOUT'})); return; }
      const state = getStatus(), accepted = state?.presentation?.accepted, sequence = state?.observation?.sequence;
      if (state?.fault || state?.requiresRestart) { finish(Object.assign(new Error('演示运行库需要重新启动'),{code:state.fault?.code || 'ERR_SHOWCASE_SCENE_RESTART'})); return; }
      const ready = state?.inputEnabled === true && accepted?.inputEnabled === true && sequence !== undefined && (afterSequence === undefined || sequenceAdvanced(sequence,afterSequence));
      if (ready) stable = sequence === previous ? stable+1 : 1;
      else stable = 0;
      previous = ready ? sequence : undefined;
      if (stable >= 2) finish(); else frame = schedule(tick);
    };
    signal?.addEventListener('abort',abort,{once:true});
    if (signal?.aborted) abort(); else frame = schedule(tick);
  });
}

function parseRequest(value) {
  if (!value || value.type !== 'showcase.scene.request' || value.schemaVersion !== 1 || !validRequestId(value.requestId) || !scenes.has(value.scene) || Object.keys(value).length !== 4 || Object.keys(value).some(key=>!['type','schemaVersion','requestId','scene'].includes(key))) throw Object.assign(new Error('Invalid scene request'),{code:'ERR_SHOWCASE_SCENE'});
  return {requestId:value.requestId,scene:value.scene};
}

export function createSceneController({initialScene,getSession,getBridge,waitForPresentation,post,origin,source,setScene = () => {},onTransition = () => {}}) {
  let scene=initialScene,active=true,transaction=null;
  const seen=new Set();
  const reply=value=>{if(active)post({type:'showcase.scene.ack',schemaVersion:1,...value});};
  return {
    get scene(){return scene;},
    get busy(){return transaction!==null;},
    close(){active=false;transaction?.abort();transaction=null;},
    async receive(event){
      if(!active||event.origin!==origin||event.source!==source||event.data?.type!=='showcase.scene.request')return false;
      let request;
      try{request=parseRequest(event.data)}catch{if(validRequestId(event.data?.requestId))reply({requestId:event.data.requestId,scene:scenes.has(event.data?.scene)?event.data.scene:null,status:'error',code:'ERR_SHOWCASE_SCENE'});return false;}
      if(seen.has(request.requestId))return false;
      if(seen.size>=1024){reply({requestId:request.requestId,scene:request.scene,status:'error',code:'ERR_SHOWCASE_SCENE_RESTART'});return false;}
      seen.add(request.requestId);
      const session=getSession();
      if(transaction||!session||!getBridge()) {reply({requestId:request.requestId,scene:request.scene,status:'error',code:'ERR_SHOWCASE_SCENE_BUSY'});return false;}
      const abort=new AbortController();transaction=abort;
      const afterSequence=session.status?.observation?.sequence;
      try{
        onTransition(true);
        const acknowledged=await getBridge().requestScene(request.scene,request.requestId);
        if(acknowledged.scene!==request.scene||acknowledged.requestId!==request.requestId||acknowledged.status!=='committed')throw Object.assign(new Error('小程序拒绝了场景切换'),{code:'ERR_SHOWCASE_SCENE'});
        await waitForPresentation({getStatus:()=>session.status,signal:abort.signal,afterSequence});
        if(!active||abort.signal.aborted)return false;
        scene=request.scene;setScene(scene);
        reply({requestId:request.requestId,scene,status:'committed'});
        return true;
      }catch(error){
        if(active&&!abort.signal.aborted)reply({requestId:request.requestId,scene:request.scene,status:'error',code:error.code||'ERR_SHOWCASE_SCENE'});
        return false;
      }finally{
        if(transaction===abort){transaction=null;if(active)onTransition(false);}
      }
    },
  };
}
