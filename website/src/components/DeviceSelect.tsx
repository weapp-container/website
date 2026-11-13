import { useEffect, useState } from 'react';
import { Select } from '@base-ui/react/select';
import { CaretUpDown, Check } from '@phosphor-icons/react';
import { DEVICE_REGISTRY, deviceGeometry, type DeviceSelection } from '../../shared/showcase-devices.mjs';
import '../styles/device-select.css';
import {demoText, type Locale} from '../data/demo-copy';

const items = DEVICE_REGISTRY.devices.map(device => ({value: device.id, label: device.label}));

function DeviceOutline({device}: {device: string}) {
  const folded = device === 'iphone-duo';
  const tablet = device === 'ipad-mini-a17-pro';
  return <span className="device-select-outline" aria-hidden="true">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x={folded ? 3 : tablet ? 7 : 9} y={folded ? 6 : 3} width={folded ? 26 : tablet ? 18 : 14} height={folded ? 20 : 26} rx={folded ? 3 : 3.5} />
      {folded ? <path d="M16 6v20" strokeDasharray="2 2" /> : <>
        <path d={tablet ? 'M15 6h2' : 'M14 6h4'} strokeLinecap="round" />
        <path d="M14 26h4" strokeLinecap="round" />
      </>}
    </svg>
  </span>;
}

export default function DeviceSelect({selection, disabled, onSelect, locale = 'zh-CN'}: {
  selection: DeviceSelection;
  locale?: Locale;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const t = (value: string) => demoText(locale, value);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const geometry = deviceGeometry(selection);
  return <Select.Root value={selection.device} items={items} disabled={disabled}
    open={open && !disabled} onOpenChange={setOpen}
    onValueChange={value => { if (value && !disabled) onSelect(value); }}>
    <Select.Label className="device-select-label">{t('演示设备')}</Select.Label>
    <Select.Trigger id="showcase-device" className="device-select-trigger">
      <DeviceOutline device={selection.device} />
      <span className="device-select-copy">
        <Select.Value className="device-select-name" />
        <span className="device-select-metrics" aria-hidden="true">{t(geometry.displayLabel)} · {geometry.screen.width} × {geometry.screen.height}</span>
      </span>
      <Select.Icon className="device-select-caret"><CaretUpDown size={16} weight="bold" /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Positioner className="device-select-positioner" side="bottom" align="start" sideOffset={8} collisionPadding={12} alignItemWithTrigger={false}>
        <Select.Popup className="device-select-popup">
          <div className="device-select-heading" aria-hidden="true"><span>{t('选择体验设备')}</span><span>{items.length}</span></div>
          <Select.List className="device-select-list">
            {DEVICE_REGISTRY.devices.map(device => {
              const preview = deviceGeometry({device: device.id, display: device.defaultDisplay, rotation: 0});
              return <Select.Item key={device.id} value={device.id} label={device.label} className="device-select-item">
                <DeviceOutline device={device.id} />
                <span className="device-select-copy">
                  <Select.ItemText className="device-select-name">{device.label}</Select.ItemText>
                  <span className="device-select-metrics" aria-hidden="true">{preview.screen.width} × {preview.screen.height}<span className="device-select-dpr">{preview.pixelRatio}×</span></span>
                </span>
                <Select.ItemIndicator className="device-select-check"><Check size={13} weight="bold" /></Select.ItemIndicator>
              </Select.Item>;
            })}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>;
}
