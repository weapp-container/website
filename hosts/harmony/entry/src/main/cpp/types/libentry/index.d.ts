export interface NativeOwner {
 loadManifestWithConfig(manifest: string, config: string): string;
 dispatch(envelope: string): string;
 inspectState(): string;
 pollTimers(nowNs: string): string;
 acknowledgePresentation(revision: string): string;
 resizeViewport(width: number, height: number): string;
 attachSurface(id: string, width: number, height: number): string;
 renderSurface(width: number, height: number): string;
 detachSurface(): string;
 hostServices(command: string): string;
 destroy(): void;
}
export const createOwner: () => NativeOwner;
