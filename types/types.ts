import { Device } from 'homey';
import Homey from 'homey/lib/Homey';
import { IungoRouter } from '../includes/iungoRouter';
import HomeySettings from 'homey/lib/HomeySettings';

declare global {
  interface Window {
    onHomeyReady: (homey: HomeySettings) => Promise<void>;
  }
}

export interface IungoBase {
  ip: string;
  id: string;
}

export interface IungoDevice {
  id: string;
  uniqueId: string;
  name: string;
  modelId: string;
  present: boolean;
  type: 'energy_meter' | 'water_meter' | 'socket' | 'solar_meter' | 'evcharger';
  settings: { [settingId: string]: any };
  capabilities: { [capabilityId: string]: any };
}

export interface EnergySettings {
  evCharger?: boolean;
  meterPowerImportedCapability?: string;
  meterPowerExportedCapability?: string;
}

export interface IungoApp extends Homey.App {
  iungos: { [key: string]: IungoRouter };
  findIungos: () => Promise<void>;
  getIungos: () => { [key: string]: IungoRouter };
  save: (iungoId: string, deviceType: string, deviceId: string, action: string, value: any) => Promise<boolean>;
}

export interface HomeyIungoDevice extends Device {
  syncDevice: (actualData: IungoDevice) => void;
}
