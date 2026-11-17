import {deviceGeometry,parseDeviceRequest,validRequestId} from '../shared/showcase-devices.mjs';

// This owner accepts only a registered display/rotation, never arbitrary runtime
// settings. The native metrics transaction owns input fencing and frame renewal.
export function createDeviceController({initialSelection,registry,getSession,applyGeometry,waitForPresentation,post,origin,source,onTransition = () => {}}) {
  let selection = initialSelection, active = true, transaction = null;
  const seen = new Set();
  const reply = value => { if (active) post({type:'showcase.device.ack',schemaVersion:1,...value}); };
  return {
    get selection() { return {...selection}; },
    get busy() { return transaction !== null; },
    close() { active = false; transaction?.abort(); transaction = null; },
    async receive(event) {
      if (!active || event.origin !== origin || event.source !== source || event.data?.type !== 'showcase.device.request') return false;
      let request;
      try { request = parseDeviceRequest(event.data,registry); }
      catch { if (validRequestId(event.data?.requestId)) reply({requestId:event.data.requestId,status:'error',code:'ERR_SHOWCASE_DEVICE'}); return false; }
      if (seen.has(request.requestId)) return false;
      // Bound owner memory without making an expired ID valid again.
      if (seen.size >= 1024) { reply({requestId:request.requestId,status:'error',code:'ERR_SHOWCASE_DEVICE_RESTART'}); return false; }
      seen.add(request.requestId);
      if (transaction || request.selection.device !== selection.device || !getSession()) {
        reply({requestId:request.requestId,status:'error',code:'ERR_SHOWCASE_DEVICE_BUSY'}); return false;
      }
      const abort = new AbortController(); transaction = abort;
      try {
        const geometry = deviceGeometry(request.selection,registry), session = getSession();
        onTransition(true);
        // Calling first installs the native fence synchronously, before the host
        // changes the canvas display box or a pointer can use its old geometry.
        const committed = session.setWindowMetrics(geometry.metrics);
        const revision = session.status?.metricsFence?.revision;
        applyGeometry(geometry);
        await committed;
        if (!active || abort.signal.aborted) return false;
        await waitForPresentation(geometry,abort.signal,{revision});
        if (!active || abort.signal.aborted) return false;
        selection = request.selection;
        reply({requestId:request.requestId,status:'committed',selection:{...selection},viewport:geometry.viewport});
        return true;
      } catch (error) {
        if (active && !abort.signal.aborted) reply({requestId:request.requestId,status:'error',code:error.code || 'ERR_SHOWCASE_DEVICE'});
        return false;
      } finally {
        if (transaction === abort) { transaction = null; if (active) onTransition(false); }
      }
    },
  };
}
