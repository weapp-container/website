export interface DeviceSelection { device: string; display: string; rotation: 0 | 90 }
export interface HostLayout { version: 1; safeInsets: {top:number; right:number; bottom:number; left:number}; verticalBarEdge: 'left' | 'right' | 'none'; reservedRegions: Array<{id:string; kind: 'occlusion' | 'division'; x:number; y:number; width:number; height:number}> }
export interface DeviceMeasurement { hostLayout: HostLayout; width: number; height: number; pixelRatio: number; statusBarHeight: number; safeArea: {top: number; right: number; bottom: number; left: number}; metricsSafeArea: {top: number; right: number; bottom: number; left: number; width: number; height: number}; screenFixed: {width: number; height: number}; orientation: 'portrait' | 'landscape' }
export interface DeviceRegistry { schemaVersion: number; defaultSelection: DeviceSelection; devices: Array<{id: string; label: string; defaultDisplay: string; displays: Array<{id: string; label: string; measurements: Record<string, DeviceMeasurement | null>; source: {status: string; [key: string]: unknown}}>}> }
export interface DeviceGeometry { selection: DeviceSelection; label: string; displayLabel: string; screen: {width: number; height: number}; content: {x: number; y: number; width: number; height: number}; usable: {x: number; y: number; width: number; height: number}; viewport: {width: number; height: number}; safeArea: DeviceMeasurement['safeArea']; pixelRatio: number; metrics: {windowWidth: number; windowHeight: number; pixelRatio: number; screenWidth: number; screenHeight: number; statusBarHeight: number; screenTop: number; deviceOrientation: DeviceMeasurement['orientation']; safeArea: DeviceMeasurement['metricsSafeArea']; hostLayout:HostLayout} }
export const DEVICE_REGISTRY: DeviceRegistry;
export function validateDeviceRegistry(registry: DeviceRegistry, options?: {requireMeasurements?: boolean}): DeviceRegistry;
export function resolveDeviceSelection(selection?: DeviceSelection, registry?: DeviceRegistry): DeviceSelection;
export function parseDeviceSelection(search: string, registry?: DeviceRegistry): {scene: string; selection: DeviceSelection};
export function selectionSearch(scene: string, selection: DeviceSelection, registry?: DeviceRegistry): string;
export function sameDeviceSelection(a: DeviceSelection, b: DeviceSelection): boolean;
export function deviceGeometry(selection: DeviceSelection, registry?: DeviceRegistry): DeviceGeometry;
export function fitDeviceScale(screen: {width: number; height: number}, available: {width: number; height: number}, bezel?: number): number;
export function validRequestId(value: unknown): boolean;
export function validateHostLayout(layout: HostLayout, width:number, height:number): HostLayout;
export function unobstructedRect(rect:{x:number; y:number; width:number; height:number},regions:HostLayout['reservedRegions']): {x:number; y:number; width:number; height:number};
