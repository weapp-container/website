import { useEffect, useRef, useState } from 'react';
import { ArrowClockwise, ArrowSquareOut, Check, Cube, Monitor, Play, ShoppingBag, Coffee, HandTap, WarningCircle } from '@phosphor-icons/react';
import { DEVICE_REGISTRY, deviceGeometry, fitDeviceScale, parseDeviceSelection, renderScaleForDisplay, runtimeSelectionSearch, sameDeviceSelection, selectionSearch, type DeviceSelection } from '../../shared/showcase-devices.mjs';
import {requestShowcaseOwner} from '../../shared/showcase-owner-channel.mjs';
import {attachShowcaseScrollBoundary} from '../../shared/showcase-scroll-boundary.mjs';
import DeviceSelect from './DeviceSelect';
import '../styles/demo.css';
import {demoLoadProgress, demoText, statusText, type DemoLoadStage, type Locale, type DemoStatus} from '../data/demo-copy';
import {localizedPath} from '../data/i18n.mjs';

const scenes = [
  { id: 'shop', title: '逛一逛商城', subtitle: '从商品浏览到模拟结算', icon: ShoppingBag, items: ['中文搜索与商品分类', '规格选择与购物车', '地址输入与模拟结算'] },
  { id: 'order', title: '点一份喜欢的', subtitle: '从菜单选择到订单完成', icon: Coffee, items: ['菜单分类与规格', '口味备注和数量调整', '模拟制作状态与订单记录'] },
  { id: 'basic', title: '试试基础交互', subtitle: '探索小程序与宿主的连接', icon: HandTap, items: ['点击、组件与滚动', '本地状态保存和恢复', '原生文字输入桥接'] },
];
const requestId = () => crypto.randomUUID();
type LoadProgress = {stage: DemoLoadStage; step: number; total: number};
const initialLoadProgress: LoadProgress = {stage: 'prepare', step: 1, total: 5};
const parseLoadProgress = (value: unknown): LoadProgress | null => {
  if (!value || typeof value !== 'object') return null;
  const progress = value as Record<string, unknown>;
  if (progress.version !== '1.0' || typeof progress.total !== 'number' || progress.total !== 5
    || typeof progress.step !== 'number' || !Number.isInteger(progress.step)
    || typeof progress.stage !== 'string' || !Object.hasOwn(demoLoadProgress, progress.stage)
    || demoLoadProgress[progress.stage as DemoLoadStage].step !== progress.step) return null;
  return {stage: progress.stage as DemoLoadStage, step: progress.step, total: progress.total};
};
type Owner = {scene: string; selection: DeviceSelection; revision: number};
type PoseKey = 'flat' | 'left' | 'right' | 'back';
type FinishKey = 'titanium' | 'silver' | 'graphite' | 'jade';

const POSES: Record<PoseKey, {rx: number; ry: number}> = {
  flat: { rx: 0, ry: 0 },
  left: { rx: 7, ry: -22 },
  right: { rx: 7, ry: 22 },
  back: { rx: 4, ry: 180 },
};
const POSE_ORDER: PoseKey[] = ['left', 'right', 'back', 'flat'];

export default function Demo({locale = 'zh-CN'}: {locale?: Locale}) {
  const t = (value: string) => demoText(locale, value);
  const [scene, setScene] = useState('shop');
  const [selection, setSelection] = useState<DeviceSelection>(DEVICE_REGISTRY.defaultSelection);
  const [displaySelection, setDisplaySelection] = useState<DeviceSelection>(DEVICE_REGISTRY.defaultSelection);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [runtime, setRuntime] = useState<{ entry: string } | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<DemoStatus>('preparing');
  const [loadProgress, setLoadProgress] = useState<LoadProgress>(initialLoadProgress);
  const [startupComplete, setStartupComplete] = useState(false);
  const [ready, setReady] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [layoutMeasured, setLayoutMeasured] = useState(false);
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);
  const [ownerDensity, setOwnerDensity] = useState<{revision: number; scale: 1 | 1.5 | 2} | null>(null);

  // 3D Hardware Stage State (defaults flat under reduced motion so geometry checks remain exact)
  const [finish, setFinish] = useState<FinishKey>('jade');
  const [pose, setPose] = useState<PoseKey | null>('flat');
  const [is3DActive, setIs3DActive] = useState(false);
  const [angleLabel, setAngleLabel] = useState('0°');
  const [morphAnim, setMorphAnim] = useState<'none' | 'fold-in' | 'fold-out' | 'rotate'>('none');
  const rigRef = useRef<HTMLDivElement>(null);
  const introPlayed = useRef(false);
  const morphTimer = useRef(0);
  const animState = useRef({
    curRx: 0, curRy: 0, targetRx: 0, targetRy: 0,
    hoverRx: 0, hoverRy: 0, targetHoverRx: 0, targetHoverRy: 0,
    velX: 0, velY: 0, dragging: false, raf: 0,
    dragStart: null as null | {x: number; y: number; rx: number; ry: number},
    lastPtr: null as null | {x: number; y: number; t: number},
    moved: false, lastClick: 0, cycleIdx: 0, introTimer: 0,
  });

  const transition = useRef(false);
  const densityTransition = useRef(false);
  const targetDensity = useRef(1);
  const appliedDensity = useRef<number | null>(null);
  const densityOwnerRevision = useRef<number | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const abortTransition = useRef<(() => void) | null>(null);
  const [available, setAvailable] = useState({width: 1, height: 1});
  const viewport = useRef<HTMLDivElement>(null);
  const geometry = deviceGeometry(displaySelection);
  const scale = fitDeviceScale(geometry.screen, available);
  const renderScale = renderScaleForDisplay(scale, devicePixelRatio);
  targetDensity.current = renderScale;
  const model = DEVICE_REGISTRY.devices.find(item => item.id === selection.device)!;
  const advanceLoadProgress = (stage: DemoLoadStage) => {
    const next = demoLoadProgress[stage];
    setLoadProgress(current => next.step >= current.step
      ? {stage, step: next.step, total: 5}
      : current);
  };

  // 3D Physics Engine (rAF spring + hover micro-tilt + inertia, exact 1:1 scale when settled at 0°)
  const sync3DVisuals = () => {
    const el = rigRef.current;
    if (!el) return;
    const st = animState.current;
    const rx = st.curRx + st.hoverRx;
    const ry = st.curRy + st.hoverRy;
    const normY = ((ry % 360) + 540) % 360 - 180;
    const settledFlat = !st.dragging
      && Math.hypot(rx, normY) < 0.8
      && Math.hypot(st.targetRx, ((st.targetRy % 360) + 540) % 360 - 180) < 0.8
      && Math.hypot(st.targetHoverRx, st.targetHoverRy) < 0.2;

    el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    el.style.setProperty('--glare-x', `${(50 + Math.max(-45, Math.min(45, normY * 1.15))).toFixed(1)}%`);
    el.style.setProperty('--glare-op', settledFlat ? '0' : `${Math.min(0.82, 0.22 + Math.min(1, Math.abs(normY) / 40) * 0.56).toFixed(2)}`);
    el.style.setProperty('--rim-shift', `${(50 + Math.max(-42, Math.min(42, normY * 1.2))).toFixed(1)}%`);
    el.style.setProperty('--shadow-x', `${Math.max(-34, Math.min(34, -normY * 0.65)).toFixed(1)}px`);
    el.style.setProperty('--shadow-scale', `${(1 - Math.min(0.28, Math.abs(Math.sin((normY * Math.PI) / 180)) * 0.26)).toFixed(3)}`);

    if (settledFlat) {
      el.style.transform = '';
      setIs3DActive(false);
      setAngleLabel('0°');
    } else {
      // Scale gently to 0.86 in 3D orbit so wide foldables never clip the stage badges or floating dock
      el.style.transform = `scale3d(0.86, 0.86, 0.86) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      setIs3DActive(true);
      const yInt = Math.round(normY);
      const xInt = Math.round(rx);
      setAngleLabel(`Y ${yInt >= 0 ? '+' : ''}${yInt}° / X ${xInt >= 0 ? '+' : ''}${xInt}°`);
    }
  };

  const ensure3DTick = () => {
    const st = animState.current;
    if (st.raf) return;
    const step = () => {
      if (!st.dragging) {
        if (Math.abs(st.velX) > 0.04 || Math.abs(st.velY) > 0.04) {
          st.targetRx = Math.max(-38, Math.min(38, st.targetRx + st.velX));
          st.targetRy += st.velY;
          st.velX *= 0.88;
          st.velY *= 0.88;
        } else {
          st.velX = 0;
          st.velY = 0;
        }
        st.curRx += (st.targetRx - st.curRx) * 0.13;
        st.curRy += (st.targetRy - st.curRy) * 0.13;
      }
      st.hoverRx += (st.targetHoverRx - st.hoverRx) * 0.14;
      st.hoverRy += (st.targetHoverRy - st.hoverRy) * 0.14;
      sync3DVisuals();
      const active = st.dragging
        || Math.abs(st.velX) > 0.04
        || Math.abs(st.velY) > 0.04
        || Math.abs(st.targetRx - st.curRx) > 0.04
        || Math.abs(st.targetRy - st.curRy) > 0.04
        || Math.abs(st.targetHoverRx - st.hoverRx) > 0.02
        || Math.abs(st.targetHoverRy - st.hoverRy) > 0.02;
      if (active) {
        st.raf = requestAnimationFrame(step);
      } else {
        st.curRx = st.targetRx;
        st.curRy = st.targetRy;
        st.hoverRx = st.targetHoverRx;
        st.hoverRy = st.targetHoverRy;
        st.raf = 0;
        sync3DVisuals();
      }
    };
    st.raf = requestAnimationFrame(step);
  };

  const goToPose = (nextPose: PoseKey) => {
    const st = animState.current;
    window.clearTimeout(st.introTimer);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const p = POSES[nextPose];
    st.velX = 0;
    st.velY = 0;
    if (nextPose === 'flat') {
      st.targetHoverRx = 0;
      st.targetHoverRy = 0;
      st.hoverRx = 0;
      st.hoverRy = 0;
    }
    const curMod = ((st.curRy % 360) + 540) % 360 - 180;
    let deltaY = p.ry - curMod;
    if (deltaY > 180) deltaY -= 360;
    if (deltaY < -180) deltaY += 360;
    st.targetRx = p.rx;
    st.targetRy = st.curRy + deltaY;
    if (reduced) {
      st.curRx = st.targetRx;
      st.curRy = st.targetRy;
    }
    st.cycleIdx = POSE_ORDER.indexOf(nextPose);
    setPose(nextPose);
    ensure3DTick();
  };

  const replayIntroSweep = () => {
    const st = animState.current;
    window.clearTimeout(st.introTimer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      goToPose('flat');
      return;
    }
    st.velX = 0;
    st.velY = 0;
    st.hoverRx = 0;
    st.hoverRy = 0;
    st.targetHoverRx = 0;
    st.targetHoverRy = 0;
    st.curRx = 8;
    st.curRy = -24;
    st.targetRx = 8;
    st.targetRy = -24;
    setPose('left');
    sync3DVisuals();
    st.introTimer = window.setTimeout(() => goToPose('flat'), 760);
  };

  // Play A1 3D entrance sweep once live container reaches ready state (so users see the sweep clearly!)
  useEffect(() => {
    if (startupComplete && !introPlayed.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      introPlayed.current = true;
      replayIntroSweep();
    }
  }, [startupComplete]);

  useEffect(() => () => {
    window.clearTimeout(animState.current.introTimer);
    window.clearTimeout(morphTimer.current);
    if (animState.current.raf) cancelAnimationFrame(animState.current.raf);
  }, []);

  const triggerMorphAnim = (kind: 'fold-in' | 'fold-out' | 'rotate') => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.clearTimeout(morphTimer.current);
    setMorphAnim(kind);
    morphTimer.current = window.setTimeout(() => setMorphAnim('none'), 540);
  };

  const handleStageHoverMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = animState.current;
    if (!is3DActive || st.dragging || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    st.targetHoverRy = (((e.clientX - rect.left) / rect.width) * 2 - 1) * 4.5;
    st.targetHoverRx = -(((e.clientY - rect.top) / rect.height) * 2 - 1) * 3.2;
    ensure3DTick();
  };
  const handleStageHoverLeave = () => {
    const st = animState.current;
    if (st.targetHoverRx === 0 && st.targetHoverRy === 0) return;
    st.targetHoverRx = 0;
    st.targetHoverRy = 0;
    ensure3DTick();
  };

  const handle3DPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    // At 0° flat, clicks inside the live screen belong to the mini-program; clicking the metallic rim enters 3D!
    if (!is3DActive) {
      if (target?.closest('.demo-device-screen')) return;
      goToPose('left');
      return;
    }
    const st = animState.current;
    window.clearTimeout(st.introTimer);
    st.velX = 0;
    st.velY = 0;
    st.targetHoverRx = 0;
    st.targetHoverRy = 0;
    st.dragStart = { x: e.clientX, y: e.clientY, rx: st.curRx, ry: st.curRy };
    st.lastPtr = { x: e.clientX, y: e.clientY, t: performance.now() };
    st.moved = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handle3DPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = animState.current;
    if (!st.dragStart || !st.lastPtr) return;
    const dx = e.clientX - st.dragStart.x;
    const dy = e.clientY - st.dragStart.y;
    if (Math.hypot(dx, dy) > 5) {
      if (!st.moved) {
        st.moved = true;
        st.dragging = true;
        rigRef.current?.classList.add('is-dragging');
      }
      const now = performance.now();
      const dt = Math.max(8, now - st.lastPtr.t);
      st.velX = (-(e.clientY - st.lastPtr.y) * 0.28 / dt) * 14;
      st.velY = ((e.clientX - st.lastPtr.x) * 0.44 / dt) * 14;
      st.lastPtr = { x: e.clientX, y: e.clientY, t: now };
      st.curRx = Math.max(-38, Math.min(38, st.dragStart.rx - dy * 0.28));
      st.curRy = st.dragStart.ry + dx * 0.44;
      st.targetRx = st.curRx;
      st.targetRy = st.curRy;
      setPose(null);
      ensure3DTick();
    }
  };
  const handle3DPointerUp = () => {
    const st = animState.current;
    if (!st.dragStart) return;
    rigRef.current?.classList.remove('is-dragging');
    const wasMoved = st.moved;
    st.dragging = false;
    st.dragStart = null;
    if (!wasMoved) {
      const now = performance.now();
      if (now - st.lastClick < 310) {
        st.lastClick = 0;
        goToPose('flat');
      } else {
        st.lastClick = now;
        st.cycleIdx = (st.cycleIdx + 1) % POSE_ORDER.length;
        goToPose(POSE_ORDER[st.cycleIdx]);
      }
    } else {
      ensure3DTick();
    }
  };

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
        advanceLoadProgress('resources');
        setRuntime(value);
      }).catch(cause => { if (!abort.signal.aborted) setError(cause.message); });
    } catch { setError('设备链接无效，请从在线体验页面重新打开。'); }
    const listener = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.schemaVersion !== 1) return;
      if (event.data.type === 'showcase.status') {
        const progress = parseLoadProgress(event.data.progress);
        if (progress) advanceLoadProgress(progress.stage);
        else if (event.data.state === 'loading') advanceLoadProgress('runtime');
        else if (event.data.state === 'ready') advanceLoadProgress('interactive');
        setReady(event.data.state === 'ready');
        setStatus(event.data.state === 'ready' ? 'ready' : event.data.state === 'closed' ? 'closed' : 'loading');
        if (event.data.state === 'error') setError('演示启动失败，请重新启动。');
      }
    };
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
    const heightLimit = () => Math.max(1, Math.min(window.innerHeight * (window.innerWidth < 768 ? .70 : .72), window.innerWidth < 768 ? 640 : 760));
    const measure = () => {
      const next = {width: Math.max(1, viewport.current?.clientWidth ?? 1), height: heightLimit()};
      setAvailable(previous => previous.width === next.width && previous.height === next.height ? previous : next);
      setLayoutMeasured(true);
      const ratio = window.devicePixelRatio || 1;
      setDevicePixelRatio(previous => previous === ratio ? previous : ratio);
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
    setReady(false); setError(''); setLoadProgress(initialLoadProgress); setStartupComplete(false); setScene(nextScene); setSelection(next); setDisplaySelection(next);
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
  useEffect(() => {
    if (runtime && owner && layoutMeasured && ownerDensity?.revision !== owner.revision) {
      setOwnerDensity({revision: owner.revision, scale: renderScale});
    }
  }, [runtime, owner?.revision, layoutMeasured, ownerDensity?.revision, renderScale]);
  useEffect(() => {
    if (!runtime || !owner || !layoutMeasured || ownerDensity?.revision !== owner.revision || !frame.current?.contentWindow) return;
    if (densityOwnerRevision.current !== owner.revision) {
      densityOwnerRevision.current = owner.revision;
      appliedDensity.current = ownerDensity.scale;
      if (appliedDensity.current === renderScale || !ready) return;
    }
    if (appliedDensity.current === renderScale || densityTransition.current || transition.current) return;
    void runTransition(async () => {
      densityTransition.current = true;
      try {
        while (mounted.current && appliedDensity.current !== targetDensity.current) {
          const nextDensity = targetDensity.current;
          const current = frame.current?.contentWindow;
          if (!current || !ready) throw new Error('演示尚未就绪。');
          setStatus('resizing');
          const id = requestId();
          const result = await exchange(current,
            {type: 'showcase.render-scale.request', schemaVersion: 1, requestId: id, renderScale: nextDensity},
            data => data.type === 'showcase.render-scale.ack' && data.requestId === id, 25000);
          if (result.status !== 'committed' || result.renderScale !== nextDensity) throw new Error('渲染清晰度调整未完成，请重新启动演示。');
          appliedDensity.current = nextDensity;
          if (mounted.current) { setReady(true); setStatus('ready'); }
        }
      } finally {
        densityTransition.current = false;
      }
    });
  }, [runtime, owner?.revision, layoutMeasured, ownerDensity?.revision, ownerDensity?.scale, ready, renderScale, switching]);
  const active = scenes.find(item => item.id === scene)!;
  const runtimeFrameMounted = Boolean(runtime && owner && ownerDensity?.revision === owner.revision);
  useEffect(() => {
    if (!runtimeFrameMounted || ready || error) return;
    const iframe = frame.current;
    if (!iframe) return;
    let disposed = false;
    let childObserver: MutationObserver | undefined;
    const inspect = () => {
      if (disposed) return;
      try {
        const childWindow = iframe.contentWindow;
        const childDocument = iframe.contentDocument;
        const root = childDocument?.documentElement;
        if (!childWindow || !childDocument || !root) return;
        if (root.dataset.state === 'loading') advanceLoadProgress('runtime');
        if (root.dataset.inputEnabled === 'true') advanceLoadProgress('restore');
        const canvas = childDocument.querySelector('canvas');
        const width = Number(root.dataset.viewportWidth);
        const height = Number(root.dataset.viewportHeight);
        if (canvas) advanceLoadProgress('presenter');
        if (root.dataset.state === 'ready' || (canvas && width > 0 && height > 0 && canvas.width === width && canvas.height === height)) {
          advanceLoadProgress('interactive');
        }
        if (!childObserver) {
          childObserver = new MutationObserver(inspect);
          childObserver.observe(root, {attributes: true, attributeFilter: ['data-state', 'data-input-enabled'], childList: true, subtree: true});
        }
      } catch {}
    };
    iframe.addEventListener('load', inspect);
    const timer = window.setInterval(inspect, 75);
    inspect();
    return () => {
      disposed = true;
      window.clearInterval(timer);
      iframe.removeEventListener('load', inspect);
      childObserver?.disconnect();
    };
  }, [runtimeFrameMounted, ready, error, owner?.revision]);
  useEffect(() => {
    if (!ready || loadProgress.step < 5 || startupComplete) return;
    const frameId = window.requestAnimationFrame(() => setStartupComplete(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [ready, loadProgress.step, startupComplete]);
  const startupLoading = !error && !startupComplete && (status === 'preparing' || status === 'loading' || (ready && loadProgress.step >= 5));

  const phoneW = (geometry.screen.width + 20) * scale;
  const phoneH = (geometry.screen.height + 20) * scale;
  const isUnfolded = displaySelection.device === 'iphone-duo' && displaySelection.display === 'inner';
  const isFoldedStack = displaySelection.device === 'iphone-duo' && displaySelection.display === 'outer';

  const toggleFoldDisplay = () => {
    if (model.displays.length <= 1 || switching || !ready) return;
    const nextDisplay = selection.display === 'inner' ? 'outer' : 'inner';
    if (is3DActive) goToPose('flat');
    triggerMorphAnim(nextDisplay === 'outer' ? 'fold-in' : 'fold-out');
    resizeDevice({...selection, display: nextDisplay});
  };

  return <section className="demo-workspace">
    <aside className="demo-sidebar">
      <div>
        <div className="demo-group-k"><span>{t('演示场景')}</span><span>3 SCENES</span></div>
        <div className="scene-tabs" role="tablist" aria-label={t('演示场景')}>{scenes.map(item => { const Icon = item.icon; return <button key={item.id} role="tab" aria-selected={scene === item.id} disabled={switching || !ready} className={scene === item.id ? 'scene-tab active' : 'scene-tab'} onClick={() => chooseScene(item.id)}><Icon size={20} weight="duotone" /><span><strong>{t(item.title)}</strong><small>{t(item.subtitle)}</small></span></button>; })}</div>
      </div>

      <fieldset className="device-controls" disabled={switching || !ready}>
        <legend>{t('选择体验设备')}</legend>
        <DeviceSelect locale={locale} selection={selection} disabled={switching || !ready} onSelect={chooseDevice} />
        <div className="device-display-controls">
          {model.displays.length > 1 && <button type="button" className="device-fold" onClick={toggleFoldDisplay}>{selection.display === 'inner' ? t('折叠屏幕') : t('展开屏幕')}</button>}
          <button type="button" className="device-rotate" aria-label={t('旋转屏幕')} onClick={() => {
            if (is3DActive) goToPose('flat');
            triggerMorphAnim('rotate');
            resizeDevice({...selection, rotation: selection.rotation === 0 ? 90 : 0});
          }}><ArrowClockwise size={16} /><span>{t('旋转屏幕')}</span></button>
        </div>
      </fieldset>

      <div className="scene-details">
        <h2>{t(active.title)}</h2>
        {active.items.map(item => <p key={item}><Check size={15} />{t(item)}</p>)}
      </div>

      <div className="demo-note"><Monitor size={19} /><p>{t('这里运行的是真实容器。所有商品和订单仅供演示，状态保存在当前设备。')}</p></div>
      <a className="text-link" href={localizedPath('/docs/integrations/', locale)}>{t('查看接入方式')}<ArrowSquareOut size={15} /></a>
    </aside>

    <div className="demo-stage" aria-busy={switching}>
      <div className="device-caption">
        <div className="device-caption-pill">
          <strong>{geometry.label}</strong>
          <span>·</span>
          <span>{t(geometry.displayLabel)} · {geometry.screen.width} × {geometry.screen.height}</span>
        </div>
        <div className="device-angle-badge">
          <Cube size={13} />
          <span>{is3DActive ? `3D · ${angleLabel}` : t('0° 正视')}</span>
        </div>
      </div>

      <div className="device-fit-area" ref={viewport} style={{height: phoneH}} onPointerMove={handleStageHoverMove} onPointerLeave={handleStageHoverLeave}>
        <div className="phone-area" style={{width: phoneW, height: phoneH}}>
          <div
            ref={rigRef}
            className={`phone-3d-rig hw3d-device${is3DActive ? ' is-3d-mode' : ''}${isFoldedStack ? ' is-folded-stack' : ''}${morphAnim === 'fold-in' ? ' is-folding-in' : morphAnim === 'fold-out' ? ' is-folding-out' : morphAnim === 'rotate' ? ' is-rotating-screen' : ''}`}
            data-finish={finish}
            style={{ ['--rad' as string]: isUnfolded ? '18px' : '24px' }}
            onPointerDown={handle3DPointerDown}
            onPointerMove={handle3DPointerMove}
            onPointerUp={handle3DPointerUp}
            onPointerCancel={handle3DPointerUp}
          >
            {/* 3D Extruded Metallic Sides + Frosted Back Face (visible when rotated in 3D) */}
            <div className="phone-3d-extras" aria-hidden="true">
              <div className="hw3d-shadow" />
              <div className="hw3d-slice s1" />
              <div className="hw3d-slice s2" />
              <div className="hw3d-slice s3" />
              <div className="hw3d-slice s4" />
              <div className="hw3d-side hw3d-side-left">
                <span className="hw3d-antenna a-top" />
                <span className="hw3d-btn rb-action" />
                <span className="hw3d-btn rb-vol1" />
                <span className="hw3d-btn rb-vol2" />
                <span className="hw3d-antenna a-bot" />
              </div>
              <div className="hw3d-side hw3d-side-right">
                <span className="hw3d-antenna a-top" />
                <span className="hw3d-btn rb-power" />
                <span className="hw3d-antenna a-bot" />
              </div>
              <div className="hw3d-side hw3d-side-top" />
              <div className="hw3d-side hw3d-side-bottom">
                <span className="hw3d-spk"><i /><i /><i /></span>
                <span className="hw3d-usbc" />
                <span className="hw3d-spk"><i /><i /><i /><i /></span>
              </div>
              <div className="hw3d-back">
                <div className="hw3d-cam">
                  <div className="hw3d-lens" />
                  <div className="hw3d-flash-col"><span className="hw3d-flash" /><span className="hw3d-lidar" /></div>
                  <div className="hw3d-lens" />
                  <div className="hw3d-lens" />
                </div>
                <div className="hw3d-back-brand">
                  <img src="/favicon.svg" width="32" height="32" alt="" />
                  <span>WEAPP CONTAINER</span>
                </div>
                <div className="hw3d-back-foot">{geometry.label.toUpperCase()} · QUICKJS / SKIA</div>
              </div>
            </div>

            {/* Live Scaled Device Frame (exact geometry.screen + 20 for browser-smoke.mjs) */}
            <div
              className={`demo-device${isUnfolded ? ' device-unfolded' : ''}`}
              style={{
                width: geometry.screen.width + 20,
                height: geometry.screen.height + 20,
                transform: is3DActive ? `translateZ(8px) scale(${scale})` : `scale(${scale})`,
              }}
            >
              <div className="demo-device-screen" ref={screen} style={{width: geometry.screen.width, height: geometry.screen.height}}>
                {runtime && owner && ownerDensity?.revision === owner.revision && <iframe ref={frame} key={owner.revision} title={`${t(active.title)}${t('交互演示')}`} src={`${runtime.entry}${runtimeSelectionSearch(owner.scene, owner.selection, ownerDensity.scale)}`} width={geometry.viewport.width} height={geometry.viewport.height} style={{left: 0, top: 0, width: geometry.viewport.width, height: geometry.viewport.height, pointerEvents: switching || is3DActive ? 'none' : undefined}} inert={switching || !!error} sandbox="allow-scripts allow-same-origin" allow="" />}
                {is3DActive && <div className="demo-3d-shield" />}
                {is3DActive && <div className="hw3d-sheen" aria-hidden="true" />}
                {geometry.safeArea.top >= 20 && <div className="device-safe-top" aria-hidden="true" style={{height: geometry.safeArea.top}}><span>9:41</span><span>•••</span></div>}
                {geometry.safeArea.bottom >= 12 && <div className="device-safe-bottom" aria-hidden="true" style={{height: geometry.safeArea.bottom}}><span /></div>}
                {status === 'closed' && !error && <div className="demo-closed-screen" role="status" aria-live="polite">
                  <div className="demo-closed-card">
                    <img src="/favicon.svg" width="32" height="32" alt="" />
                    <strong>{statusText.closed[locale === 'en' ? 1 : 0]}</strong>
                    <p>{t('本地状态已保存，运行容器已安全退出。')}</p>
                    <button type="button" className="demo-closed-btn" disabled={switching || !runtime} onClick={() => chooseScene(scene, true)}>
                      <ArrowClockwise size={15} />
                      <span>{t('重新打开演示')}</span>
                    </button>
                  </div>
                </div>}
                {startupLoading && <div className="demo-loading" role="status" aria-live="polite" data-demo-progress>
                  <p>{t(demoLoadProgress[loadProgress.stage].label)}</p>
                  <div className="demo-progress-track" role="progressbar" aria-label={t('演示启动进度')} aria-valuemin={1} aria-valuemax={loadProgress.total} aria-valuenow={loadProgress.step} aria-valuetext={`${t(demoLoadProgress[loadProgress.stage].label)} (${loadProgress.step} / ${loadProgress.total})`}>
                    <span style={{width: `${loadProgress.step / loadProgress.total * 100}%`}} />
                  </div>
                  <small>{loadProgress.step} / {loadProgress.total}</small>
                </div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apple-Style Centered Floating Capsule Dock */}
      <div className="demo-dock-wrap">
        <div className="hw3d-dock" role="toolbar" aria-label={t('3D 视角控制')}>
          <button type="button" className={`hw3d-dock-btn${pose === 'flat' ? ' is-active' : ''}`} onClick={() => goToPose('flat')}>{t('0° 正视')}</button>
          <button type="button" className={`hw3d-dock-btn${pose === 'left' ? ' is-active' : ''}`} onClick={() => goToPose('left')}>{t('3D 左侧')}</button>
          <button type="button" className={`hw3d-dock-btn${pose === 'right' ? ' is-active' : ''}`} onClick={() => goToPose('right')}>{t('3D 右侧')}</button>
          <button type="button" className={`hw3d-dock-btn${pose === 'back' ? ' is-active' : ''}`} onClick={() => goToPose('back')}>{t('180° 背面')}</button>
          {model.displays.length > 1 && <>
            <span className="hw3d-dock-sep" aria-hidden="true" />
            <button type="button" className="hw3d-dock-btn" disabled={switching || !ready} onClick={toggleFoldDisplay}>
              {selection.display === 'inner' ? t('外屏') : t('内屏')}
            </button>
          </>}
          <span className="hw3d-dock-sep" aria-hidden="true" />
          <div className="hw3d-swatches" role="group" aria-label={t('机身外观')}>
            {(['titanium', 'silver', 'graphite', 'jade'] as FinishKey[]).map(f => (
              <button
                key={f}
                type="button"
                className={`hw3d-swatch${finish === f ? ' is-active' : ''}`}
                data-finish={f}
                aria-label={f}
                aria-pressed={finish === f}
                onClick={() => setFinish(f)}
              />
            ))}
          </div>
          <span className="hw3d-dock-sep" aria-hidden="true" />
          <button type="button" className="hw3d-dock-btn" onClick={replayIntroSweep} title={t('重播 3D 展示')}><Play size={11} weight="fill" /><span>3D</span></button>
        </div>
        <p className="demo-dock-hint">{t('0° 正视可直接操作容器；切到 3D 视角后可拖拽旋转，双击回正')}</p>
      </div>

      {error && <div className="demo-error" role="alert"><WarningCircle size={28} /><p>{t(error)}</p><button className="button secondary" disabled={switching} onClick={() => location.assign(`${localizedPath('/demo/', locale)}${selectionSearch(scene, selection)}`)}>{t('重新加载')}</button></div>}
      <div className="demo-toolbar">
        <span className="demo-status-pill" role="status"><span className="status-dot" aria-hidden="true" />{statusText[status][locale === 'en' ? 1 : 0]}</span>
        <button aria-label={t('重新启动当前演示')} disabled={switching || !runtime || (!ready && status !== 'closed')} onClick={() => chooseScene(scene, true)}><ArrowClockwise size={15} />{t('重新开始')}</button>
      </div>
    </div>
  </section>;
}
