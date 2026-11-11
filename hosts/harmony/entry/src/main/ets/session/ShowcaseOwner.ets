import * as native from 'libentry.so';
import type { NativeOwner } from 'libentry.so';
import common from '@ohos.app.ability.common';
import preferences from '@ohos.data.preferences';
import cryptoFramework from '@ohos.security.cryptoFramework';
import util from '@ohos.util';

interface ManifestModule { id: string; sha256: string; }
interface ManifestStyle { id: string; scope: string; }
interface ManifestRoute { path: string; }
interface Manifest { integrity: Integrity; modules: Array<ManifestModule>; styles: Array<ManifestStyle>; routes: Array<ManifestRoute>; }
interface Integrity { root: string; algorithm: string; }
interface ModulePayload { id: string; bytes: Array<number>; }
interface Envelope { protocolVersion: string; sessionId: string; requestId: string; kind: string; op: string; payload: Object; }
interface Response { protocolVersion: string; sessionId: string; requestId: string; kind: string; op: string; payload: ResponsePayload; }
interface ResponsePayload { ok?: boolean; engine?: string; engineProviderAvailable?: boolean; loadedModules?: number; committed?: boolean; frameId?: number; revision?: number; }
interface Batch { ok?: boolean; messages: Array<Response>; }
interface NativeStatus { ok: boolean; operation?: string; renderer?: string; gpuSurface?: boolean; }
interface Inspection { sessionId: string; page?: Page; viewRevision?: number; renderRevision?: number; }
interface Page { id: number; route: string; }
interface Contact { identifier: number; clientX: number; clientY: number; pageX: number; pageY: number; }
interface Detail { x?: number; y?: number; }
interface Pointer { id: number; x: number; y: number; lastX: number; lastY: number; time: number; moved: boolean; }
interface NativeTouch { type: string; x: number; y: number; timeStamp: number; detail: Detail; touches: Array<Contact>; changedTouches: Array<Contact>; }
interface HostOutbox { requests: Array<HostRequest>; }
interface HostRequest { kind: string; payload: GuestMessage; }
export interface GuestMessage { type: string; protocolVersion: number; sessionId: string; state?: Object | null; pageId?: number; requestId?: string; title?: string; value?: string; maxLength?: number; multiline?: boolean; }
interface Restore { type: string; protocolVersion: number; sessionId: string; state: Object | null; }
interface TextReply { type: string; protocolVersion: number; sessionId: string; pageId?: number; requestId?: string; value?: string; }
interface HostDimensions {windowWidth: number; windowHeight: number;}
interface SessionConfig {engine: string; session_id: string; require_integrity: boolean; page_render_mode: string; host: HostDimensions;}
interface Launch {path: string; query: Record<string, string>;}
interface InitPayload {manifest: Manifest; modules: Array<ModulePayload>; blobs: Record<string, Array<number>>; launchOptions: Launch;}
interface LifecyclePayload {event: string; options?: Launch;}
interface TouchPayload {events: Array<NativeTouch>;}
interface HostCommand {operation: string; payload: Record<string, Object>;}
interface Viewport {x: number; y: number; width: number; height: number;}
interface RenderPayload {frameId: number; templateId: string; styleIds: Array<string>; viewport: Viewport; blobs: Record<string, Array<number>>;}

/** This adapter owns host UI and the public N-API handle. All engine code is
 * supplied as reviewed, policy-bound native libraries by the private release. */
class ShowcaseOwner {
  private owner: NativeOwner | null = null;
  private readonly sessionId: string = `showcase-${Date.now()}`;
  private sequence: number = 0;
  private frame: number = 0;
  private renderedRevision: number = -1;
  private renderedPage: number = -1;
  private width: number = 1;
  private height: number = 1;
  private physicalWidth: number = 1;
  private physicalHeight: number = 1;
  private attached: boolean = false;
  private surfaceId: string = '';
  private presented: boolean = false;
  private foreground: boolean = true;
  private closing: boolean = false;
  private closed: boolean = false;
  private guestSession: string = '';
  private pendingText: GuestMessage | null = null;
  private pointerState: Pointer | null = null;
  private manifest: Manifest | null = null;
  private blobs: Record<string, Array<number>> = {};
  private store: preferences.Preferences | null = null;
  private saved: Object | null = null;
  private writes: Promise<void> = Promise.resolve();
  private closeOperation: Promise<void> | null = null;
  private unloadDispatched: boolean = false;
  private savedEncoded: string = '';
  private stateRevision: number = 0;
  private persistedRevision: number = 0;
  onText: ((message: GuestMessage) => void) | null = null;
  onStatus: ((message: string) => void) | null = null;

  async start(context: common.UIAbilityContext, width: number, height: number): Promise<void> {
    if (this.owner !== null || this.closing || this.closed) throw new Error('Session already consumed');
    this.width = width; this.height = height;
    this.store = preferences.getPreferencesSync(context, { name: 'showcase-state-v1' });
    const encoded = this.store.getSync('state', '') as string;
    if (encoded.length > 0 && encoded.length <= 128 * 1024) {
      try { this.saved = JSON.parse(encoded) as Object; } catch (_) { this.saved = null; }
    }
    const decode = (bytes: Uint8Array): string => util.TextDecoder.create('utf-8', { fatal: true }).decodeWithStream(bytes);
    const manifestJson = decode(context.resourceManager.getRawFileContentSync('portable-pack/manifest.json'));
    const manifest = JSON.parse(manifestJson) as Manifest;
    if (manifest.integrity.algorithm !== 'sha256' || !/^[a-f0-9]{64}$/.test(manifest.integrity.root) || manifest.routes.length !== 1 || manifest.routes[0].path !== 'pages/home/index') throw new Error('Unexpected showcase pack');
    const paths = JSON.parse(decode(context.resourceManager.getRawFileContentSync('portable-pack-files.json'))) as Array<string>;
    for (const path of paths) {
      if (path === 'manifest.json') continue;
      if (!/^blobs\/sha256\/[a-f0-9]{64}$/.test(path)) throw new Error('Invalid bundled resource path');
      const bytes = context.resourceManager.getRawFileContentSync(`portable-pack/${path}`);
      const md = cryptoFramework.createMd('SHA256'); md.updateSync({ data: bytes });
      const digest = md.digestSync().data;
      let actual: string = '';
      for (let index = 0; index < digest.length; index++) actual += digest[index].toString(16).padStart(2, '0');
      if (actual !== path.substring(13)) throw new Error('Bundled resource SHA-256 mismatch');
      const values: Array<number> = [];
      for (let index = 0; index < bytes.length; index++) values.push(bytes[index]);
      this.blobs[`sha256:${actual}`] = values;
    }
    if (this.closing) return;
    this.manifest = manifest;
    this.owner = native.createOwner();
    const config: SessionConfig = {engine: 'quickjs', session_id: this.sessionId, require_integrity: true, page_render_mode: 'native-gpu', host: {windowWidth: width, windowHeight: height}};
    this.status(this.owner.loadManifestWithConfig(manifestJson, JSON.stringify(config)));
    const modules = manifest.modules.map((item: ManifestModule): ModulePayload => {
      const bytes = this.blobs[`sha256:${item.sha256.replace('sha256:', '')}`];
      if (bytes === undefined) throw new Error('Missing bundled module');
      return {id: item.id, bytes};
    });
    const launch: Launch = {path: 'pages/home/index', query: {}};
    const initialized = this.dispatch('app.init', {manifest, modules, blobs: this.blobs, launchOptions: launch} as InitPayload);
    if (initialized.engine !== 'quickjs' || initialized.engineProviderAvailable !== true || initialized.loadedModules !== modules.length) throw new Error('Native engine initialization failed');
    this.dispatch('app.lifecycle', {event: 'launch', options: launch} as LifecyclePayload);
    this.dispatch('page.push', launch);
    this.commit();
  }
  attach(id: string, width: number, height: number): void {
    if (this.owner === null || this.closing) return;
    if (this.attached) this.detach();
    this.surfaceId = id;
    this.physicalWidth = width; this.physicalHeight = height;
    this.tryAttach();
  }
  private tryAttach(): void {
    if (this.owner === null || this.attached || this.surfaceId.length === 0 || this.closing) return;
    const result = JSON.parse(this.owner.attachSurface(this.surfaceId, this.physicalWidth, this.physicalHeight)) as NativeStatus;
    if (result.ok !== true && result.operation === 'surface-size-not-ready') return;
    this.status(JSON.stringify(result));
    if (result.renderer !== 'skia-gpu-gles') throw new Error('Native GLES renderer is required');
    this.attached = true; this.present();
  }
  detach(): void {
    if (this.owner !== null && this.attached) { this.status(this.owner.detachSurface()); this.attached = false; }
    this.surfaceId = ''; this.presented = false; this.pointerState = null;
  }
  resize(width: number, height: number): void {
    if (this.owner === null || this.closing || (width === this.width && height === this.height)) return;
    this.cancelPointer(); this.batch(this.owner.resizeViewport(width, height)); this.width = width; this.height = height; this.commit();
  }
  setForeground(visible: boolean): void {
    if (this.foreground === visible || this.closing) return;
    this.foreground = visible;
    if (this.owner === null) return;
    this.cancelPointer(); this.dispatch('app.lifecycle', {event: visible ? 'show' : 'hide'} as LifecyclePayload);
    if (visible) this.commit();
  }
  pump(): void {
    if (this.owner === null || this.closing || !this.foreground) return;
    this.tryAttach();
    // Convert integer milliseconds before appending; Number nanoseconds lose
    // precision and cannot identify a timer deadline reliably.
    this.batch(this.owner.pollTimers(`${Date.now()}000000`));
    const command: HostCommand = {operation: 'take', payload: {}};
    const outbox = JSON.parse(this.owner.hostServices(JSON.stringify(command))) as HostOutbox;
    for (const request of outbox.requests) if (request.kind === 'message') this.message(request.payload);
    const current = this.inspect();
    if (current.viewRevision !== this.renderedRevision || current.page?.id !== this.renderedPage) this.commit();
    else if (!this.presented) this.present();
  }
  pointer(action: string, id: number, x: number, y: number): void {
    if (!this.presented || !this.foreground || this.closing) return;
    const now = Date.now(), events: Array<NativeTouch> = [], current = this.pointerState;
    if (action === 'down') {
      if (current !== null) {this.cancelPointer(); return;}
      this.pointerState = {id, x, y, lastX: x, lastY: y, time: now, moved: false};
      events.push(this.touch('touchstart', id, x, y, now, true));
    } else if (action === 'move' && current !== null && current.id === id) {
      current.lastX = x; current.lastY = y; current.moved = current.moved || Math.hypot(x - current.x, y - current.y) > 8;
      events.push(this.touch('touchmove', id, x, y, now, true));
    } else if (action === 'up' && current !== null && current.id === id) {
      this.pointerState = null; events.push(this.touch('touchend', id, x, y, now, false));
      if (!current.moved && Math.hypot(x - current.x, y - current.y) <= 8 && now - current.time <= 500) events.push(this.touch('tap', id, x, y, now, false));
    } else { this.cancelPointer(); return; }
    if (events.length > 0) {this.dispatch('event.batch', {events} as TouchPayload); this.commit();}
  }
  textReply(request: GuestMessage, value: string | null): void {
    const pending = this.pendingText;
    if (this.closing || request.sessionId !== this.guestSession || pending === null || pending.sessionId !== request.sessionId || pending.pageId !== request.pageId || pending.requestId !== request.requestId) return;
    this.pendingText = null;
    const reply: TextReply = {type: value === null ? 'showcase.text.cancel' : 'showcase.text.commit', protocolVersion: 1, sessionId: request.sessionId, pageId: request.pageId, requestId: request.requestId};
    if (value !== null) reply.value = value.substring(0, Math.min(2000, Math.max(1, request.maxLength || 200)));
    this.dispatch('host.message', reply); this.commit();
  }
  close(): Promise<void> {
    if (this.closed) return Promise.resolve();
    if (this.closeOperation !== null) return this.closeOperation;
    if (!this.closing) {
      this.closing = true; this.guestSession = ''; this.pendingText = null;
    }
    const operation = (async (): Promise<void> => {
      if (this.owner !== null && !this.unloadDispatched) {
        this.cancelPointer(); this.dispatch('app.lifecycle', {event: 'unload'} as LifecyclePayload); this.unloadDispatched = true;
      }
      try {await this.writes;} catch (_) { /* Retry the current state below. */ }
      if (this.persistedRevision !== this.stateRevision) await this.persist(this.savedEncoded, this.stateRevision);
      if (this.store !== null) await this.store.flush();
      this.detach(); this.owner?.destroy(); this.owner = null; this.closed = true;
      this.onStatus?.('演示已关闭');
    })();
    this.closeOperation = operation.finally((): void => {this.closeOperation = null;});
    return this.closeOperation;
  }
  private message(message: GuestMessage): void {
    if (message.protocolVersion !== 1 || !message.sessionId) return;
    if (message.type === 'showcase.state.ready') {
      this.guestSession = message.sessionId; this.pendingText = null;
      const restore: Restore = {type: 'showcase.state.restore', protocolVersion: 1, sessionId: this.guestSession, state: this.saved};
      this.dispatch('host.message', restore); return;
    }
    if (message.sessionId !== this.guestSession) return;
    if (message.type === 'showcase.state.changed') {
      const encoded = JSON.stringify(message.state || null);
      if (encoded.length > 128 * 1024) throw new Error('State exceeds persistence limit');
      this.saved = message.state || null;
      this.savedEncoded = encoded; const revision = ++this.stateRevision;
      const persist = async (): Promise<void> => this.persist(encoded, revision);
      this.writes = this.writes.then(persist, persist);
      this.writes.catch((error: Object): void => this.onStatus?.(String(error)));
    } else if (message.type === 'showcase.text.request' && message.requestId && message.pageId !== undefined) {this.pendingText = message; this.onText?.(message);}
  }
  private async persist(encoded: string, revision: number): Promise<void> {
    if (this.store === null) throw new Error('No state store');
    this.store.putSync('state', encoded); await this.store.flush(); this.persistedRevision = revision;
  }
  private dispatch(op: string, payload: Object): ResponsePayload {
    if (this.owner === null) throw new Error('No native owner');
    const requestId = `host-${++this.sequence}`;
    const request: Envelope = {protocolVersion: '1.0', sessionId: this.sessionId, requestId, kind: 'request', op, payload};
    const matches = this.batch(this.owner.dispatch(JSON.stringify(request))).filter((item: Response): boolean => item.kind === 'response' && item.requestId === requestId && item.op === op);
    if (matches.length !== 1 || matches[0].payload.ok !== true) throw new Error(`Native operation failed: ${op}`);
    return matches[0].payload;
  }
  private batch(encoded: string): Array<Response> {
    const batch = JSON.parse(encoded) as Batch;
    if (batch.ok === false || !Array.isArray(batch.messages)) throw new Error('Invalid native batch');
    for (const item of batch.messages) if (item.sessionId !== this.sessionId || item.protocolVersion !== '1.0' || item.op === 'error' || item.payload.ok === false) throw new Error('Native transaction failed');
    return batch.messages;
  }
  private status(encoded: string): void { if ((JSON.parse(encoded) as NativeStatus).ok !== true) throw new Error('Native surface operation failed'); }
  private inspect(): Inspection {
    if (this.owner === null) throw new Error('No native owner');
    const current = JSON.parse(this.owner.inspectState()) as Inspection;
    if (current.sessionId !== this.sessionId) throw new Error('Native session identity changed');
    return current;
  }
  private commit(): void {
    if (this.manifest === null) return;
    const current = this.inspect(), page = current.page;
    if (page === undefined || page.route !== 'pages/home/index') throw new Error('Unexpected native page');
    const frameId = this.frame + 1;
    const styleIds = this.manifest.styles.map((style: ManifestStyle): string => style.id);
    const payload: RenderPayload = {frameId, templateId: `template:${page.route}.wxml`, styleIds, viewport: {x: 0, y: 0, width: this.width, height: this.height}, blobs: this.blobs};
    const ack = this.dispatch('render.commit', payload);
    if (ack.committed !== true || ack.frameId !== frameId || ack.revision === undefined) throw new Error('Native frame was not committed');
    this.frame = frameId; this.renderedRevision = ack.revision; this.renderedPage = page.id; this.presented = false; this.present();
  }
  private present(): void {
    if (this.owner === null || !this.attached || !this.foreground || this.closing) return;
    const result = JSON.parse(this.owner.renderSurface(this.physicalWidth, this.physicalHeight)) as NativeStatus;
    if (result.ok !== true && result.operation === 'surface-size-not-ready') return;
    this.status(JSON.stringify(result));
    if (result.gpuSurface !== true || result.renderer !== 'skia-gpu-gles') throw new Error('Native frame was not presented');
    const revision = this.inspect().renderRevision;
    if (revision === undefined || !Number.isSafeInteger(revision) || revision <= 0) throw new Error('Invalid native presentation revision');
    this.batch(this.owner.acknowledgePresentation(String(revision))); this.presented = true;
    this.onStatus?.('本地演示 · 数据保存在此设备');
  }
  private cancelPointer(): void {
    const current = this.pointerState; this.pointerState = null;
    if (current !== null && this.owner !== null) this.dispatch('event.batch', {events: [this.touch('touchcancel', current.id, current.lastX, current.lastY, Date.now(), false)]} as TouchPayload);
  }
  private touch(type: string, id: number, x: number, y: number, timeStamp: number, active: boolean): NativeTouch {
    const contact: Contact = {identifier: id, clientX: x, clientY: y, pageX: x, pageY: y};
    const detail: Detail = type === 'tap' ? {x, y} : {};
    return {type, x, y, timeStamp, detail, touches: active ? [contact] : [], changedTouches: [contact]};
  }
}
// Keep an owner retained until the asynchronous persistence/release barrier
// succeeds, including when ArkUI disappears before the flush finishes.
export const showcaseOwner = new ShowcaseOwner();
