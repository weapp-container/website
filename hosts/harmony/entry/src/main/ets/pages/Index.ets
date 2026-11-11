import common from '@ohos.app.ability.common';
import { showcaseOwner, GuestMessage } from '../session/ShowcaseOwner';

@Entry
@Component
struct Index {
  @State status: string = '正在准备演示';
  @State editing: boolean = false;
  @State text: string = '';
  @State title: string = '填写内容';
  @State limit: number = 200;
  @StorageLink('showcaseForeground') @Watch('foregroundChanged') foreground: boolean = true;
  private readonly surface: XComponentController = new XComponentController();
  private request: GuestMessage | null = null;
  private started: boolean = false;
  private starting: boolean = false;
  private surfaceReady: boolean = false;
  private areaWidth: number = 0;
  private areaHeight: number = 0;
  private timer: number = -1;

  aboutToAppear(): void {
    showcaseOwner.onStatus = (message: string): void => { this.status = message; };
    showcaseOwner.onText = (message: GuestMessage): void => {
      this.request = message; this.text = message.value || ''; this.title = message.title || '填写内容';
      this.limit = Math.min(2000, Math.max(1, message.maxLength || 200)); this.editing = true;
    };
  }
  aboutToDisappear(): void { this.stop(); showcaseOwner.close().catch((error: Object): void => this.failed(error)); }
  onBackPress(): boolean { this.stop(); showcaseOwner.close().catch((error: Object): void => this.failed(error)); return true; }
  private foregroundChanged(): void { try {showcaseOwner.setForeground(this.foreground);} catch (error) {this.failed(error as Object);} }
  private async synchronize(): Promise<void> {
    if (!this.surfaceReady || this.areaWidth <= 0 || this.areaHeight <= 0 || this.starting) return;
    this.starting = true;
    try {
      if (!this.started) {await showcaseOwner.start(getContext(this) as common.UIAbilityContext, Math.round(this.areaWidth), Math.round(this.areaHeight)); this.started = true;}
      showcaseOwner.resize(Math.round(this.areaWidth), Math.round(this.areaHeight));
      showcaseOwner.attach(this.surface.getXComponentSurfaceId(), Math.round(this.getUIContext().vp2px(this.areaWidth)), Math.round(this.getUIContext().vp2px(this.areaHeight)));
      if (this.timer < 0) this.timer = setInterval((): void => {try {showcaseOwner.pump();} catch (error) {this.failed(error as Object);}}, 16);
    } catch (error) {this.failed(error as Object);} finally {this.starting = false;}
  }
  private stop(): void {if (this.timer >= 0) clearInterval(this.timer); this.timer = -1;}
  private failed(error: Object): void {this.stop(); this.status = String(error);}
  private reply(commit: boolean): void {
    const request = this.request; this.editing = false; this.request = null;
    if (request !== null) try {showcaseOwner.textReply(request, commit ? this.text : null);} catch (error) {this.failed(error as Object);}
  }
  private touch(event: TouchEvent): void {
    if (this.editing) return;
    const contact = event.changedTouches[0]; if (contact === undefined) return;
    let action = event.type === TouchType.Down ? 'down' : event.type === TouchType.Move ? 'move' : event.type === TouchType.Up ? 'up' : 'cancel';
    if (event.touches.length > 1) action = 'cancel';
    try {showcaseOwner.pointer(action, contact.id, contact.x * Math.round(this.areaWidth) / this.areaWidth, contact.y * Math.round(this.areaHeight) / this.areaHeight);} catch (error) {this.failed(error as Object);}
  }
  build(): void {
    Column() {
      Row() {
        Text('Weapp Container').fontSize(18).fontWeight(FontWeight.Medium)
        Blank()
        Button('关闭演示').onClick((): void => {this.stop(); this.editing = false; showcaseOwner.close().catch((error: Object): void => this.failed(error));})
      }.padding(12).width('100%')
      Text(this.status).fontSize(12).padding(8).width('100%').backgroundColor('#EDF5F1')
      Stack() {
        XComponent({id: 'showcase-surface', type: 'surface', libraryname: 'entry', controller: this.surface})
          .width('100%').height('100%')
          .onLoad((): void => {this.surfaceReady = true; this.synchronize();})
          .onDestroy((): void => {this.surfaceReady = false; try {showcaseOwner.detach();} catch (error) {this.failed(error as Object);}})
        Column() {}.width('100%').height('100%').hitTestBehavior(HitTestMode.Block).onTouch((event: TouchEvent): void => this.touch(event))
        if (this.editing) {
          Column({space: 16}) {
            Text(this.title).fontSize(18)
            TextArea({text: this.text}).maxLength(this.limit).height(120).onChange((value: string): void => {this.text = value;})
            Row({space: 24}) {Button('取消').onClick((): void => this.reply(false)); Button('确认').onClick((): void => this.reply(true));}
          }.padding(24).width('90%').backgroundColor('#FFFFFF').borderRadius(16)
        }
      }.width('100%').layoutWeight(1)
        .onAreaChange((_previous: Area, area: Area): void => {this.areaWidth = Number(area.width); this.areaHeight = Number(area.height); this.synchronize();})
    }.width('100%').height('100%')
  }
}
