import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { iosProject } from '../native-ios-project.mjs';

test('generated iOS build configurations allow phone landscape and all four iPad orientations',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'showcase-ios-project-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const project=await iosProject({directory}),source=await readFile(join(project,'project.pbxproj'),'utf8');
  const configurations=[...source.matchAll(/isa=XCBuildConfiguration;name=(Debug|Release);buildSettings=\{([^}]*)\}/g)].filter(([, ,settings])=>settings.includes('GENERATE_INFOPLIST_FILE=YES;'));
  assert.deepEqual(configurations.map(([,name])=>name).sort(),['Debug','Release']);
  const phone=['UIInterfaceOrientationPortrait','UIInterfaceOrientationLandscapeLeft','UIInterfaceOrientationLandscapeRight'];
  for(const [,name,settings] of configurations){
    const orientations=key=>{const match=settings.match(new RegExp(`${key}="([^"]+)";`));assert.ok(match,`${name} must generate ${key}`);return match[1].split(' ');};
    assert.deepEqual(orientations('INFOPLIST_KEY_UISupportedInterfaceOrientations'),phone);
    assert.deepEqual(orientations('INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone'),phone);
    assert.deepEqual(orientations('INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad'),[phone[0],'UIInterfaceOrientationPortraitUpsideDown',...phone.slice(1)]);
    assert.match(settings,/TARGETED_DEVICE_FAMILY="1,2";/);
  }
  const scheme=await readFile(join(project,'xcshareddata/xcschemes/Showcase.xcscheme'),'utf8');
  assert.match(scheme,/LaunchAction buildConfiguration="Release"/);assert.match(scheme,/ReferencedContainer="container:Showcase.xcodeproj"/);
});
