const {createModel,cleanText} = require('./model')
const PROTOCOL=1, STORAGE_KEY='weapp-container-showcase:state:v1'
function createShowcase({transport,storage,onChange,sessionId}={}) {
  const id=sessionId || 'showcase-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)
  let pageId=1,requestSequence=0,pending=null,closed=false,closeRequested=false,hostRestored=false,listeners=[],sceneListener=null
  const sceneRequests=new Set()
  let initial=null
  try {if(storage)initial=storage.get(STORAGE_KEY)}catch(_){}
  const emit=value=>{if(!closed&&transport)transport.postMessage({...value,protocolVersion:PROTOCOL,sessionId:id})}
  const notify=()=>{const value=model.snapshot();listeners.slice().forEach(listener=>listener(value));if(onChange)onChange(value)}
  const model=createModel(initial,state=>{try{if(storage)storage.set(STORAGE_KEY,state)}catch(_){}emit({type:'showcase.state.changed',state});notify()})
  const receive=message=>{
    if(closed||!message||message.protocolVersion!==PROTOCOL||message.sessionId!==id)return false
    if(message.type==='showcase.state.restore') {
      if(hostRestored||model.snapshot().revision!==0)return false
      hostRestored=true
      if(message.state!==null&&message.state!==undefined)model.replace(message.state)
      notify();return true
    }
    if(message.type==='showcase.scene.request') {
      if(!/^[a-zA-Z0-9_-]{1,96}$/.test(message.requestId||'')||!['basic','shop','order'].includes(message.scene)||Object.keys(message).some(key=>!['type','protocolVersion','sessionId','requestId','scene'].includes(key))||Object.keys(message).length!==5||sceneRequests.has(message.requestId))return false
      sceneRequests.add(message.requestId)
      if(sceneRequests.size>128)sceneRequests.delete(sceneRequests.values().next().value)
      const request={requestId:message.requestId,scene:message.scene}
      Promise.resolve().then(()=>sceneListener?sceneListener(request.scene):false).then(result=>{
        if(closed)return
        const committed=result===true||result?.committed===true
        emit({type:'showcase.scene.ack',requestId:request.requestId,scene:request.scene,status:committed?'committed':'error',...(committed?{}:{code:'ERR_SHOWCASE_SCENE'})})
      },()=>{if(!closed)emit({type:'showcase.scene.ack',requestId:request.requestId,scene:request.scene,status:'error',code:'ERR_SHOWCASE_SCENE'})})
      return true
    }
    if(!pending||message.pageId!==pageId||message.pageId!==pending.pageId||message.requestId!==pending.requestId)return false
    if(message.type!=='showcase.text.commit'&&message.type!=='showcase.text.cancel')return false
    if(message.type==='showcase.text.commit'&&typeof message.value!=='string')return false
    const operation=pending;pending=null
    if(message.type==='showcase.text.commit'&&typeof message.value==='string')operation.commit(cleanText(message.value,operation.maxLength))
    if(operation.done)operation.done();return true
  }
  if(transport)transport.onMessage(receive)
  function cancelText() {
    if(!pending)return
    const previous=pending;pending=null
    emit({type:'showcase.text.dismiss',pageId:previous.pageId,requestId:previous.requestId})
    if(previous.done)previous.done()
  }
  return {
    model,sessionId:id,
    ready(){emit({type:'showcase.state.ready'})},
    subscribe(listener){listeners.push(listener);listener(model.snapshot());return()=>{listeners=listeners.filter(item=>item!==listener)}},
    onSceneRequest(listener){if(typeof listener!=='function')throw new TypeError('Scene request listener must be a function');sceneListener=listener;return()=>{if(sceneListener===listener)sceneListener=null}},
    page(){cancelText();pageId++;return pageId},
    receive,
    text({field,title,value,maxLength=120,multiline=false,commit,done}) {
      cancelText()
      if(!transport)return false
      const requestId='text-'+(++requestSequence)
      pending={requestId,pageId,maxLength,commit,done}
      emit({type:'showcase.text.request',pageId,requestId,field,title,value:cleanText(value,maxLength),maxLength,multiline:!!multiline})
      return true
    },
    reset(){cancelText();hostRestored=true;return model.reset()},
    requestClose(){if(closed||closeRequested)return false;closeRequested=true;cancelText();emit({type:'showcase.state.changed',state:model.snapshot()});emit({type:'showcase.close.request'});return true},
    close(){cancelText();closed=true;listeners=[];if(transport&&transport.offMessage)transport.offMessage(receive)}
  }
}
module.exports={createShowcase,PROTOCOL,STORAGE_KEY}
