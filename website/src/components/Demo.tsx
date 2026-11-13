import { useEffect, useRef, useState } from 'react';
import { ArrowClockwise, ArrowSquareOut, Check, Monitor, ShoppingBag, Coffee, HandTap, WarningCircle } from '@phosphor-icons/react';
import { DEVICE_REGISTRY, deviceGeometry, fitDeviceScale, parseDeviceSelection, sameDeviceSelection, selectionSearch, type DeviceSelection } from '../../shared/showcase-devices.mjs';
import {requestShowcaseOwner} from '../../shared/showcase-owner-channel.mjs';
import {attachShowcaseScrollBoundary} from '../../shared/showcase-scroll-boundary.mjs';
import DeviceSelect from './DeviceSelect';
import '../styles/demo.css';
import {demoText, statusText, type Locale, type DemoStatus} from '../data/demo-copy';
import {localizedPath} from '../data/i18n.mjs';

const scenes = [
  { id: 'shop', title: '逛一逛商城', subtitle: '从商品浏览到模拟结算', icon: ShoppingBag, items: ['中文搜索与商品分类', '规格选择与购物车', '地址输入与模拟支付'] },
  { id: 'order', title: '点一份喜欢的', subtitle: '从菜单选择到订单完成', icon: Coffee, items: ['菜单分类与规格', '口味备注和数量调整', '模拟制作状态与订单记录'] },
  { id: 'basic', title: '试试基础交互', subtitle: '探索小程序与宿主的连接', icon: HandTap, items: ['点击、组件与滚动', '本地状态保存和恢复', '原生文字输入桥接'] },
];
const requestId = () => crypto.randomUUID();
type Owner = {scene: string; selection: DeviceSelection; revision: number};

export default function Demo({locale = 'zh-CN'}: {locale?: Locale}) {
  const t = (value: string) => demoText(locale, value);
  const [scene, setScene] = useState('shop');
  const [selection, setSelection] = useState<DeviceSelection>(DEVICE_REGISTRY.defaultSelection);
  const [displaySelection, setDisplaySelection] = useState<DeviceSelection>(DEVICE_REGISTRY.defaultSelection);
  // Source selection belongs to an owner, while folding and rotation belong to
  // that owner's metrics. Changing metrics must never navigate the iframe.
  const [owner, setOwner] = useState<Owner | null>(null);
  const [runtime, setRuntime] = useState<{ entry: string } | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<DemoStatus>('preparing');
  const [ready, setReady] = useState(false);
  const [switching, setSwitching] = useState(false);
  const transition = useRef(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const abortTransition = useRef<(() => void) | null>(null);
  const [available, setAvailable] = useState({width: 1, height: 1});
  const viewport = useRef<HTMLDivElement>(null);
  const geometry = deviceGeometry(displaySelection);
  const scale = fitDeviceScale(geometry.screen, available);
  const model = DEVICE_REGISTRY.devices.find(item => item.id === selection.device)!;

  useEffect(() => {
    if (screen.current) return attachShowcaseScrollBoundary(screen.current);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const abort = new AbortController();
    try {
      const selected = parseDeviceSelection(location.search);
      setScene(selected.scene); setSelection(selected.selection); setDisplaySelection(selected.selection);
      setOwner({...selected, revision: 0});
      fetch('/showcase-runtime.json', { signal: abort.signal, cache: 'no-cache' }).then(async response => {
        if (!response.ok) throw new Error('演示运行库暂时无法加载，请稍后重试。');
        const value = await response.json();
        if (value.schemaVersion !== 1 || !/^\/runtime\/[a-f0-9]{64}\/index\.html$/.test(value.entry)) throw new Error('演示产物配置不完整。');
        setRuntime(value);
      }).catch(cause => { if (!abort.signal.aborted) setError(cause.message); });
    } catch { setError('设备链接无效，请从在线体验页面重新打开。'); }
    const listener = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.schemaVersion !== 1) return;
      if (event.data.type === 'showcase.status') {
        setReady(event.data.state === 'ready');
        setStatus(event.data.state === 'ready' ? 'ready' : event.data.state === 'closed' ? 'closed' : 'loading');
        if (event.data.state === 'error') setError('演示启动失败，请重新启动。');
      }
    };
    // pagehide retires the iframe's native owner even when the browser caches
    // this document. A history restore must rebuild from URL + persisted state.
    const restore = (event: PageTransitionEvent) => { if (event.persisted) location.reload(); };
    window.addEventListener('message', listener);
    window.addEventListener('pageshow', restore);
    return () => {
      mounted.current = false; abort.abort(); abortTransition.current?.();
      window.removeEventListener('message', listener);
      window.removeEventListener('pageshow', restore);
      frame.current?.contentWindow?.postMessage({type: 'showcase.close', schemaVersion: 1, requestId: requestId()}, location.origin);
    };
  }, []);
  useEffect(() => {
    // The height cap comes from the viewport, never from this auto-sized stage.
    // Observing stage height would feed the scaled height back into the next fit.
    const heightLimit = () => Math.max(1, Math.min(window.innerHeight * (window.innerWidth < 768 ? .70 : .72), window.innerWidth < 768 ? 640 : 760));
    const measure = () => {
      const next = {width: Math.max(1, viewport.current?.clientWidth ?? 1), height: heightLimit()};
      setAvailable(previous => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    measure(); window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const updateUrl = (nextScene: string, next: DeviceSelection) => history.replaceState(null, '', `${location.pathname}${selectionSearch(nextScene, next)}${location.hash}`);
  const exchange = async (target: Window, payload: Record<string, unknown>, accepts: (data: any) => boolean, timeoutMs: number) => {
    const abort = new AbortController(), cancel = () => abort.abort();
    abortTransition.current = cancel;
    try {
      return await requestShowcaseOwner({owner: target, payload, accepts, timeoutMs, origin: location.origin, currentOwner: () => frame.current?.contentWindow,
        subscribe: listener => { window.addEventListener('message', listener); return () => window.removeEventListener('message', listener); },
        post: (target, message, origin) => target.postMessage(message, origin), signal: abort.signal});
    } finally { if (abortTransition.current === cancel) abortTransition.current = null; }
  };
  const replaceOwner = async (nextScene: string, next: DeviceSelection) => {
    const current = frame.current?.contentWindow;
    if (current) {
      setStatus('closing');
      await exchange(current, {type: 'showcase.close', schemaVersion: 1, requestId: requestId()}, data => data.type === 'showcase.status' && data.state === 'closed', 15000);
    }
    if (!mounted.current) return;
    setReady(false); setError(''); setScene(nextScene); setSelection(next); setDisplaySelection(next);
    setOwner(previous => ({scene: nextScene, selection: next, revision: (previous?.revision ?? 0) + 1}));
    setStatus('loading'); updateUrl(nextScene, next);
  };
  const runTransition = async (action: () => Promise<void>) => {
    if (transition.current) return;
    transition.current = true; setSwitching(true);
    try { await action(); }
    catch (cause) { if (mounted.current) { setError(cause instanceof Error ? cause.message : '设备切换失败，请重新启动。'); setReady(false); } }
    finally { transition.current = false; if (mounted.current) setSwitching(false); }
  };
  const chooseScene = (id: string, restart = false) => {
    if (scene === id && !restart) return;
    if (restart) { void runTransition(() => replaceOwner(id, selection)); return; }
    void runTransition(async () => {
      const current=frame.current?.contentWindow;
      if(!current||!ready)throw new Error('演示尚未就绪。');
      setStatus('scene');
      const idRequest=requestId();
      const result=await exchange(current,{type:'showcase.scene.request',schemaVersion:1,requestId:idRequest,scene:id},data=>data.type==='showcase.scene.ack',20000);
      if(result.status!=='committed'||result.scene!==id)throw new Error('场景切换未完成，请重新启动演示。');
      if(!mounted.current)return;
      setScene(id);setReady(true);setStatus('ready');updateUrl(id,selection);
    });
  };
  const chooseDevice = (id: string) => {
    if (id === selection.device) return;
    const device = DEVICE_REGISTRY.devices.find(item => item.id === id);
    if (device) void runTransition(() => replaceOwner(scene, {device: id, display: device.defaultDisplay, rotation: 0}));
  };
  const resizeDevice = (next: DeviceSelection) => {
    if (!ready || sameDeviceSelection(selection, next)) return;
    void runTransition(async () => {
      const current = frame.current?.contentWindow;
      if (!current) throw new Error('演示尚未就绪。');
      setStatus('resizing'); setDisplaySelection(next);
      const result = await exchange(current, {type: 'showcase.device.request', schemaVersion: 1, requestId: requestId(), selection: next}, data => data.type === 'showcase.device.ack', 25000);
      const expected = deviceGeometry(next);
      if (result.status !== 'committed' || !sameDeviceSelection(result.selection, next) || result.viewport?.width !== expected.viewport.width || result.viewport?.height !== expected.viewport.height) throw new Error('屏幕调整未完成，请重新启动演示。');
      if (!mounted.current) return;
      setSelection(next); setStatus('ready'); updateUrl(scene, next);
    });
  };
  const active = scenes.find(item => item.id === scene)!;
  return <section className="section-wrap demo-workspace">
    <aside className="demo-sidebar">
      <div className="scene-tabs" role="tablist" aria-label={t('演示场景')}>{scenes.map(item => { const Icon = item.icon; return <button key={item.id} role="tab" aria-selected={scene === item.id} disabled={switching || !ready} className={scene === item.id ? 'scene-tab active' : 'scene-tab'} onClick={() => chooseScene(item.id)}><Icon size={23} weight="duotone" /><span><strong>{t(item.title)}</strong><small>{t(item.subtitle)}</small></span></button>; })}</div>
      <fieldset className="device-controls" disabled={switching || !ready}>
        <legend>{t('选择体验设备')}</legend>
        <DeviceSelect locale={locale} selection={selection} disabled={switching || !ready} onSelect={chooseDevice} />
        <div className="device-display-controls">
          {model.displays.length > 1 && <button type="button" className="device-fold" onClick={() => resizeDevice({...selection, display: selection.display === 'inner' ? 'outer' : 'inner'})}>{selection.display === 'inner' ? t('折叠屏幕') : t('展开屏幕')}</button>}
          <button type="button" className="device-rotate" aria-label={t('旋转屏幕')} onClick={() => resizeDevice({...selection, rotation: selection.rotation === 0 ? 90 : 0})}><ArrowClockwise size={17} /><span>{t('旋转屏幕')}</span></button>
        </div>
      </fieldset>
      <div className="scene-details"><h2>{t(active.title)}</h2>{active.items.map(item => <p key={item}><Check size={16} />{t(item)}</p>)}</div>
      <div className="demo-note"><Monitor size={21} /><p>{t('这里运行的是真实容器。所有商品和订单仅供演示，状态保存在当前设备。')}</p></div>
      <a className="text-link" href={localizedPath('/guide/', locale)}>{t('查看接入方式')}<ArrowSquareOut size={16} /></a>
    </aside>
    <div className="demo-stage" aria-busy={switching}>
      <div className="device-caption"><strong>{geometry.label}</strong><span>{t(geometry.displayLabel)} · {geometry.screen.width} × {geometry.screen.height}</span></div>
      <div className="device-fit-area" ref={viewport} style={{height: (geometry.screen.height + 20) * scale}}>
        <div className="phone-area" style={{width: (geometry.screen.width + 20) * scale, height: (geometry.screen.height + 20) * scale}}>
          <div className={`demo-device${displaySelection.device === 'iphone-duo' && displaySelection.display === 'inner' ? ' device-unfolded' : ''}`} style={{width: geometry.screen.width + 20, height: geometry.screen.height + 20, transform: `scale(${scale})`}}>
            <div className="demo-device-screen" ref={screen} style={{width: geometry.screen.width, height: geometry.screen.height}}>
              {runtime && owner && <iframe ref={frame} key={owner.revision} title={`${t(active.title)}${t('交互演示')}`} src={`${runtime.entry}${selectionSearch(owner.scene, owner.selection)}`} width={geometry.viewport.width} height={geometry.viewport.height} style={{left: 0, top: 0, width: geometry.viewport.width, height: geometry.viewport.height, pointerEvents: switching ? 'none' : undefined}} inert={switching || !!error} sandbox="allow-scripts allow-same-origin" allow="" />}
              {geometry.safeArea.top >= 20 && <div className="device-safe-top" aria-hidden="true" style={{height: geometry.safeArea.top}}><span>9:41</span><span>•••</span></div>}
              {geometry.safeArea.bottom >= 12 && <div className="device-safe-bottom" aria-hidden="true" style={{height: geometry.safeArea.bottom}}><span /></div>}
            </div>
          </div>
        </div>
      </div>
      {!runtime && !error && <div className="demo-loading" role="status"><span /><span /><span /><p>{t('正在准备演示…')}</p></div>}
      {error && <div className="demo-error" role="alert"><WarningCircle size={28} /><p>{t(error)}</p><button className="button secondary" disabled={switching} onClick={() => location.assign(`${localizedPath('/demo/', locale)}${selectionSearch(scene, selection)}`)}>{t('重新加载')}</button></div>}
      <div className="demo-toolbar"><span role="status">{statusText[status][locale === 'en' ? 1 : 0]}</span><button aria-label={t('重新启动当前演示')} disabled={switching || !runtime || (!ready && status !== 'closed')} onClick={() => chooseScene(scene, true)}><ArrowClockwise size={18} />{t('重新开始')}</button></div>
    </div>
  </section>;
}
