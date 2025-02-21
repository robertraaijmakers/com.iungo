'use strict';

import type HomeySettings from 'homey/lib/HomeySettings.js';
import { IungoRouter } from '../includes/iungoRouter.js';

class SettingScript {
  private homey: HomeySettings;

  constructor(homey: HomeySettings) {
    this.homey = homey;
  }

  public async onHomeyReady(): Promise<void> {
    // Register on change events of fields in settings page.
    document.getElementById('apiSave')?.addEventListener('click', () => this.save());
    document.getElementById('advanced')?.addEventListener('change', () => this.showHideFields());

    // Get current settings
    this.homey.get('manualIp', (err: string, result: any) => this.readManualSetting(err, result));
    this.homey.get('iungoIps', (err: string, result: any) => this.readIungoIps(err, result));

    this.homey.ready();
  }

  async save() {
    const advanced = this.getInputValue('advanced');
    const iungo1 = this.getInputValue('iungoAddress_1');
    const iungo2 = this.getInputValue('iungoAddress_2');
    const iungo3 = this.getInputValue('iungoAddress_3');

    if (advanced === 'no') {
      this.homey.set('manualIp', false, this.#onSettingsSet);
      this.homey.set('iungoIps', {}, this.#onSettingsSet);
    } else {
      // Only set iungo ips if advanced is set to yes and values are not empty
      const iungoIps: { [key: string]: string } = {};
      if (iungo1) iungoIps.iungo1 = iungo1;
      if (iungo2) iungoIps.iungo2 = iungo2;
      if (iungo3) iungoIps.iungo3 = iungo3;

      this.homey.set('manualIp', true, this.#onSettingsSet);
      this.homey.set('iungoIps', iungoIps, this.#onSettingsSet);
    }

    this.showHideFields();

    // Trigger rediscover + get just set values
    this.homey.api('GET', `/getiungodevices?rediscover=true`, (someError: string, iungoDevices: { [key: string]: IungoRouter }) => {
      if (someError) {
        return;
      }

      let counter = 1;
      for (const iungoDevice of Object.values(iungoDevices)) {
        if (!iungoDevice.address) return;

        this.setInputValue(`iungoAddress_${counter}`, iungoDevice.address.replace('http://', ''));
        this.setPlaceholderValue(`iungoAddress_${counter}`, iungoDevice.address.replace('http://', ''));
        counter += 1;
      }
    });
  }

  showHideFields() {
    const advanced = this.getInputValue('advanced');
    if (advanced === 'yes') {
      this.hideInputFieldAndLabel('iungoAddress_1', false);
      this.hideInputFieldAndLabel('iungoAddress_2', false);
      this.hideInputFieldAndLabel('iungoAddress_3', false);
    } else {
      this.hideInputFieldAndLabel('iungoAddress_1', true);
      this.hideInputFieldAndLabel('iungoAddress_2', true);
      this.hideInputFieldAndLabel('iungoAddress_3', true);
    }
  }

  readIungoIps(err: string, iungoIps: any) {
    if (err) {
      this.setInputValue('advanced', 'no');
    }

    if (iungoIps && Object.keys(iungoIps).length > 0) {
      this.setInputValue('iungoAddress_1', iungoIps.iungo1);
      this.setPlaceholderValue('iungoAddress_1', iungoIps.iungo1);
      this.setInputValue('iungoAddress_2', iungoIps.iungo2);
      this.setPlaceholderValue('iungoAddress_2', iungoIps.iungo2);
      this.setInputValue('iungoAddress_3', iungoIps.iungo3);
      this.setPlaceholderValue('iungoAddress_3', iungoIps.iungo3);
    }

    this.homey.api('GET', `/getiungodevices?rediscover=false`, (someError: string, iungoDevices: { [key: string]: IungoRouter }) => {
      if (someError) {
        return;
      }

      let counter = 1;
      for (const iungoDevice of Object.values(iungoDevices)) {
        if (!iungoDevice.address) return;

        this.setInputValue(`iungoAddress_${counter}`, iungoDevice.address.replace('http://', ''));
        this.setPlaceholderValue(`iungoAddress_${counter}`, iungoDevice.address.replace('http://', ''));
        counter += 1;
      }
    });
  }

  readManualSetting(err: string, setManual: boolean) {
    if (err) {
      this.setInputValue('advanced', 'no');
      return;
    }

    if (setManual) {
      this.setInputValue('advanced', 'yes');
    } else {
      this.setInputValue('advanced', 'no');
    }

    this.showHideFields();
  }

  setInputValue(id: string, value: string | number | undefined) {
    const input = document.getElementById(id) as HTMLInputElement;
    if (input) {
      input.value = value?.toString() || '';
    }
  }

  setPlaceholderValue(id: string, value: string | number | undefined) {
    const input = document.getElementById(id) as HTMLInputElement;
    if (input) {
      input.placeholder = value?.toString() || '';
    }
  }

  getInputValue(id: string) {
    const input = document.getElementById(id) as HTMLInputElement;
    if (input) {
      return input.value;
    }

    return null;
  }

  hideInputFieldAndLabel(fieldName: string, hide: boolean) {
    const field = document.getElementById(`${fieldName}_group`);
    if (field && hide) {
      field.style.display = 'none';
    } else if (field) {
      field.style.display = 'block';
    }
  }

  #onSettingsSet(error: string, result: any) {
    if (error) {
      console.log('Error updating settings in Homey: ', error);
      return;
    }

    console.log('Settings updated in Homey', result);
  }
}

window.onHomeyReady = async (homey: any): Promise<void> => await new SettingScript(homey).onHomeyReady();
