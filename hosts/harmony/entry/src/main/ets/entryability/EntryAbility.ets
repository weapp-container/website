import UIAbility from '@ohos.app.ability.UIAbility';
import window from '@ohos.window';
import { showcaseOwner } from '../session/ShowcaseOwner';
export default class EntryAbility extends UIAbility {
 onCreate(): void { AppStorage.setOrCreate('showcaseForeground', true); }
 onForeground(): void { AppStorage.set('showcaseForeground', true); }
 onBackground(): void { AppStorage.set('showcaseForeground', false); }
 onDestroy(): void { showcaseOwner.close().catch((error: Object): void => console.error(String(error))); }
 onWindowStageCreate(stage: window.WindowStage): void { stage.loadContent('pages/Index'); }
}
