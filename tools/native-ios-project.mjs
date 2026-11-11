import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT } from './sdk-install.mjs';

export async function iosProject({ directory = resolve(ROOT, 'hosts/native-ios') } = {}) {
  const project = resolve(directory, 'Showcase.xcodeproj');
  await mkdir(resolve(project, 'xcshareddata/xcschemes'), { recursive: true });
  const objects = []; let counter = 0;
  const add = content => { const id = (++counter).toString(16).padStart(24, 'A'); objects.push(`${id}={${content}};`); return id; };
  const source = add('isa=PBXFileReference;lastKnownFileType=sourcecode.swift;path=Showcase.swift;sourceTree="<group>";');
  const pack = add('isa=PBXFileReference;lastKnownFileType=folder;path="portable-pack";sourceTree="<group>";');
  const product = add('isa=PBXFileReference;explicitFileType=wrapper.application;path=Showcase.app;sourceTree=BUILT_PRODUCTS_DIR;');
  const sdk = add('isa=XCLocalSwiftPackageReference;relativePath="../../.runtime/sdk/ios";');
  const dependency = add(`isa=XCSwiftPackageProductDependency;package=${sdk};productName=WeappContainer;`);
  const framework = add(`isa=PBXBuildFile;productRef=${dependency};`);
  const build = file => add(`isa=PBXBuildFile;fileRef=${file};`);
  const sources = add(`isa=PBXSourcesBuildPhase;buildActionMask=2147483647;files=(${build(source)});runOnlyForDeploymentPostprocessing=0;`);
  const resources = add(`isa=PBXResourcesBuildPhase;buildActionMask=2147483647;files=(${build(pack)});runOnlyForDeploymentPostprocessing=0;`);
  const frameworks = add(`isa=PBXFrameworksBuildPhase;buildActionMask=2147483647;files=(${framework});runOnlyForDeploymentPostprocessing=0;`);
  const configurations = settings => {
    const debug = add(`isa=XCBuildConfiguration;name=Debug;buildSettings={${settings}};`);
    const release = add(`isa=XCBuildConfiguration;name=Release;buildSettings={${settings}SWIFT_OPTIMIZATION_LEVEL="-O";DEBUG_INFORMATION_FORMAT="dwarf-with-dsym";OTHER_LDFLAGS="$(inherited) -Wl,-S,-x";};`);
    return add(`isa=XCConfigurationList;buildConfigurations=(${debug},${release});defaultConfigurationIsVisible=0;defaultConfigurationName=Release;`);
  };
  const config = configurations('SWIFT_VERSION=5.0;IPHONEOS_DEPLOYMENT_TARGET=16.0;TARGETED_DEVICE_FAMILY="1,2";PRODUCT_BUNDLE_IDENTIFIER=dev.weapp.container.showcase.nativehost;PRODUCT_NAME="$(TARGET_NAME)";GENERATE_INFOPLIST_FILE=YES;INFOPLIST_KEY_UIApplicationSceneManifest_Generation=YES;INFOPLIST_KEY_UILaunchScreen_Generation=YES;INFOPLIST_KEY_UISupportedInterfaceOrientations="UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone="UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad="UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";CODE_SIGN_STYLE=Automatic;SUPPORTED_PLATFORMS="iphoneos iphonesimulator";');
  const target = add(`isa=PBXNativeTarget;buildConfigurationList=${config};buildPhases=(${sources},${frameworks},${resources});buildRules=();dependencies=();name=Showcase;productName=Showcase;productReference=${product};productType="com.apple.product-type.application";packageProductDependencies=(${dependency});`);
  const products = add(`isa=PBXGroup;children=(${product});name=Products;sourceTree="<group>";`);
  const group = add(`isa=PBXGroup;children=(${source},${pack},${products});sourceTree="<group>";`);
  const projectConfiguration = configurations('CLANG_ENABLE_MODULES=YES;SDKROOT=iphoneos;');
  const main = add(`isa=PBXProject;attributes={LastUpgradeCheck=1600;};buildConfigurationList=${projectConfiguration};compatibilityVersion="Xcode 14.0";developmentRegion=en;knownRegions=(en,Base);mainGroup=${group};productRefGroup=${products};projectDirPath="";projectRoot="";packageReferences=(${sdk});targets=(${target});`);
  await writeFile(resolve(project, 'project.pbxproj'), `// !$*UTF8*$!\n{archiveVersion=1;classes={};objectVersion=56;objects={${objects.join('\n')}};rootObject=${main};}\n`);
  const reference = `<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${target}" BuildableName="Showcase.app" BlueprintName="Showcase" ReferencedContainer="container:Showcase.xcodeproj"/>`;
  await writeFile(resolve(project, 'xcshareddata/xcschemes/Showcase.xcscheme'), `<?xml version="1.0"?><Scheme version="1.7"><BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">${reference}</BuildActionEntry></BuildActionEntries></BuildAction><LaunchAction buildConfiguration="Release"><BuildableProductRunnable>${reference}</BuildableProductRunnable></LaunchAction><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="NO"/></Scheme>\n`);
  return project;
}
if (process.argv[1]?.endsWith('native-ios-project.mjs')) console.log(await iosProject());
