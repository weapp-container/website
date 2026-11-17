import {DEVICE_REGISTRY} from './showcase-device-registry.mjs';
export {DEVICE_REGISTRY};
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, keys) => record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
const check = (condition, message) => { if (!condition) throw Object.assign(new Error(message),{code:'ERR_SHOWCASE_DEVICE'}); };
const id = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
export function validateDeviceRegistry(registry, {requireMeasurements = true} = {}) {
  check(record(registry) && registry.schemaVersion === 1 && Array.isArray(registry.devices) && registry.devices.length > 0,'Invalid device registry');
  const devices = new Set();
  for (const device of registry.devices) {
    check(record(device) && id(device.id) && !devices.has(device.id) && typeof device.label === 'string' && Array.isArray(device.displays) && device.displays.length > 0,'Invalid or duplicate device'); devices.add(device.id);
    const displays = new Set();
    for (const display of device.displays) {
      check(record(display) && id(display.id) && !displays.has(display.id) && typeof display.label === 'string' && record(display.measurements) && record(display.source),'Invalid or duplicate display'); displays.add(display.id);
      check(own(display.measurements,['0','90']),'Both measured orientations are required');
      for (const rotation of [0,90]) {
        const measurement = display.measurements[String(rotation)];
        if (!requireMeasurements && measurement === null) continue;
        validateMeasurement(measurement);
      }
      if (requireMeasurements) check(display.source.status === 'verified','Device measurements have not been verified');
    }
    check(displays.has(device.defaultDisplay),'Default display does not exist');
  }
  resolveDeviceSelection(registry.defaultSelection,registry);
  return registry;
}
function validateMeasurement(value) {
  check(record(value) && ['width','height'].every(key => Number.isSafeInteger(value[key]) && value[key] > 0 && value[key] <= 4096),'Measured logical screen dimensions are required');
  check(Number.isFinite(value.pixelRatio) && value.pixelRatio > 0 && value.pixelRatio <= 8 && Number.isFinite(value.statusBarHeight) && value.statusBarHeight >= 0 && value.statusBarHeight <= value.height,'Invalid measured density or status bar');
  check(own(value.safeArea,['top','right','bottom','left']) && Object.values(value.safeArea).every(inset => Number.isFinite(inset) && inset >= 0),'Measured safe area is required');
  check(own(value.screenFixed,['width','height']) && Object.values(value.screenFixed).every(extent => Number.isSafeInteger(extent) && extent > 0 && extent <= 4096),'Measured fixed screen space is required');
  check(own(value.metricsSafeArea,['top','right','bottom','left','width','height']) && Object.values(value.metricsSafeArea).every(Number.isFinite),'Measured fixed safe-area rectangle is required');
  const safe = value.metricsSafeArea;
  check(safe.left >= 0 && safe.top >= 0 && safe.right <= value.screenFixed.width && safe.bottom <= value.screenFixed.height && safe.width > 0 && safe.height > 0 && safe.right-safe.left === safe.width && safe.bottom-safe.top === safe.height,'Fixed safe-area edges disagree with measured screen space');
  check(['portrait','landscape'].includes(value.orientation),'Measured orientation is required');
  const width = value.width-value.safeArea.left-value.safeArea.right, height = value.height-value.safeArea.top-value.safeArea.bottom;
  check(Number.isSafeInteger(width) && width > 0 && Number.isSafeInteger(height) && height > 0,'Safe area must leave a positive integral logical viewport');
  validateHostLayout(value.hostLayout,value.width,value.height);
  return value;
}
export function validateHostLayout(layout,width,height) {
  check(own(layout,['version','safeInsets','verticalBarEdge','reservedRegions']) && layout.version === 1 && ['left','right','none'].includes(layout.verticalBarEdge),'Invalid registered host layout');
  check(own(layout.safeInsets,['top','right','bottom','left']) && Object.values(layout.safeInsets).every(value=>Number.isFinite(value)&&value>=0) && layout.safeInsets.left+layout.safeInsets.right<width && layout.safeInsets.top+layout.safeInsets.bottom<height,'Invalid local safe insets');
  check(Array.isArray(layout.reservedRegions) && layout.reservedRegions.length<=64,'Invalid registered reserved regions');
  const identifiers=new Set();
  for(const region of layout.reservedRegions) {
    check(own(region,['id','kind','x','y','width','height']) && typeof region.id==='string' && region.id.length>0 && region.id.length<=128 && !identifiers.has(region.id) && ['occlusion','division'].includes(region.kind),'Invalid registered region identity');
    identifiers.add(region.id);
    check(['x','y','width','height'].every(key=>Number.isFinite(region[key])) && region.x>=0 && region.y>=0 && region.width>0 && region.height>0 && region.x+region.width<=width+.5 && region.y+region.height<=height+.5,'Reserved region is outside its surface');
  }
  return layout;
}
// Return the largest local rectangle that avoids active regions. Region frames
// already include platform margins, so callers must not subtract them again.
export function unobstructedRect(rect,regions) {
  let panes=[{...rect}];
  for(const region of regions) {
    const next=[];
    for(const pane of panes) {
      const left=Math.max(pane.x,region.x),top=Math.max(pane.y,region.y),right=Math.min(pane.x+pane.width,region.x+region.width),bottom=Math.min(pane.y+pane.height,region.y+region.height);
      if(right<=left||bottom<=top) { next.push(pane);continue; }
      for(const candidate of [{x:pane.x,y:pane.y,width:left-pane.x,height:pane.height},{x:right,y:pane.y,width:pane.x+pane.width-right,height:pane.height},{x:pane.x,y:pane.y,width:pane.width,height:top-pane.y},{x:pane.x,y:bottom,width:pane.width,height:pane.y+pane.height-bottom}]) if(candidate.width>0&&candidate.height>0)next.push(candidate);
    }
    panes=next;
  }
  return panes.sort((a,b)=>b.width*b.height-a.width*a.height||a.x-b.x||a.y-b.y)[0]??{...rect,width:0,height:0};
}
export function resolveDeviceSelection(selection = DEVICE_REGISTRY.defaultSelection, registry = DEVICE_REGISTRY) {
  check(own(selection,['device','display','rotation']) && id(selection.device) && id(selection.display) && [0,90].includes(selection.rotation),'Invalid device selection');
  const device = registry.devices.find(value => value.id === selection.device);
  check(device && device.displays.some(value => value.id === selection.display),'Unknown device or display');
  return {device:selection.device,display:selection.display,rotation:selection.rotation};
}
export function parseDeviceSelection(search, registry = DEVICE_REGISTRY) {
  const params = new URLSearchParams(search);
  const allowed = ['scene','device','display','rotation'];
  for (const key of params.keys()) check(allowed.includes(key) && params.getAll(key).length === 1,'Unsupported or duplicate showcase query');
  const scene = params.get('scene') ?? 'shop'; check(['shop','order','basic'].includes(scene),'Unknown showcase scene');
  const deviceId = params.get('device') ?? registry.defaultSelection.device;
  const device = registry.devices.find(value => value.id === deviceId); check(device,'Unknown device');
  const rotation = params.get('rotation'); check(rotation === null || rotation === '0' || rotation === '90','Unsupported rotation');
  return {scene,selection:resolveDeviceSelection({device:deviceId,display:params.get('display') ?? device.defaultDisplay,rotation:rotation === null ? registry.defaultSelection.rotation : Number(rotation)},registry)};
}
export function selectionSearch(scene, selection, registry = DEVICE_REGISTRY) {
  const value = resolveDeviceSelection(selection,registry); check(['shop','order','basic'].includes(scene),'Unknown showcase scene');
  return '?'+new URLSearchParams({scene,device:value.device,display:value.display,rotation:String(value.rotation)});
}
export function sameDeviceSelection(a,b) { return a?.device === b?.device && a?.display === b?.display && a?.rotation === b?.rotation; }
export function fitDeviceScale(screen, available, bezel = 10) {
  check(record(screen) && record(available) && [screen.width,screen.height,available.width,available.height].every(value => Number.isFinite(value) && value > 0) && Number.isFinite(bezel) && bezel >= 0,'Invalid device fit bounds');
  return Math.min(1,available.width/(screen.width+2*bezel),available.height/(screen.height+2*bezel));
}
export function deviceGeometry(selection, registry = DEVICE_REGISTRY) {
  const selected = resolveDeviceSelection(selection,registry), device = registry.devices.find(value => value.id === selected.device), display = device.displays.find(value => value.id === selected.display);
  const measured = validateMeasurement(display.measurements[String(selected.rotation)]);
  check(display.source.status === 'verified','Device measurements have not been verified');
  const local=measured.hostLayout.safeInsets,content = {x:local.left,y:local.top,width:measured.width-local.left-local.right,height:measured.height-local.top-local.bottom};
  const hostLayout=structuredClone(measured.hostLayout),usable=unobstructedRect(content,hostLayout.reservedRegions);
  return {selection:selected,label:device.label,displayLabel:display.label,screen:{width:measured.width,height:measured.height},content,usable,viewport:{width:measured.width,height:measured.height},safeArea:{...measured.safeArea},pixelRatio:measured.pixelRatio,
    metrics:{windowWidth:measured.width,windowHeight:measured.height,pixelRatio:measured.pixelRatio,screenWidth:measured.width,screenHeight:measured.height,statusBarHeight:measured.statusBarHeight,screenTop:0,deviceOrientation:measured.orientation,safeArea:{...measured.metricsSafeArea},hostLayout}};
}
export function validRequestId(value) { return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,96}$/.test(value); }
export function parseDeviceRequest(value, registry = DEVICE_REGISTRY) {
  check(own(value,['type','schemaVersion','requestId','selection']) && value.type === 'showcase.device.request' && value.schemaVersion === 1 && validRequestId(value.requestId),'Invalid device request');
  return {requestId:value.requestId,selection:resolveDeviceSelection(value.selection,registry)};
}
