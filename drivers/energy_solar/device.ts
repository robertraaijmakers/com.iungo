'use strict';

import Homey from 'homey';
import { IungoApp, IungoDevice } from '../../types/types';

const deviceType = 'solar_meter';

module.exports = class DeviceSolarMeter extends Homey.Device {
  async onInit() {
    this.log('device init');
  }

  // sync device data and settings
  async syncDevice(refreshedData: IungoDevice) {
    let deviceData = this.getData();
    this.log('_syncDevice', deviceData.iungo_id, deviceData.id);

    // New device state / data
    if (!refreshedData || refreshedData.present === false) {
      return this.setUnavailable(this.homey.__('unreachable'));
    }

    if (!this.getAvailable()) {
      this.setAvailable()
        .catch((error) => this.error(`Error setting availability: `, error))
        .then(() => this.log(`Device is available (${deviceData.iungo_id}-${deviceData.id}).`));
    }

    // Current device state
    let deviceState = this.getState();
    for (const [capabilityId, value] of Object.entries(refreshedData.capabilities)) {
      try {
        const hasCapability = this.hasCapability(capabilityId);
        if (!hasCapability) await this.addCapability(capabilityId).catch(this.error);

        if (value === null || (typeof deviceState !== 'undefined' && typeof deviceState[capabilityId] !== 'undefined' && deviceState[capabilityId] === value)) continue;

        await this.setCapabilityValue(capabilityId, value)
          .catch((error) => this.error(`Error updating capability ${capabilityId} with value ${value}: `, error))
          .then(() => this.log(`Update capability: ${capabilityId} with value ${value}`));
      } catch (error) {
        this.error(`Error updating capability ${capabilityId}:`, error);
      }
    }

    // Sync settings to internal state
    let settings = this.getSettings();
    if (settings.length === 0) {
      // No settings yet available. Apply all settings.
      this.setSettings(refreshedData.settings);
    } else {
      // Check if there are differences, and update all values (performance wise cheaper, only one call).
      let changed = false;
      for (let settingId in settings) {
        var oldSetting = settings[settingId];
        var newSetting = refreshedData.settings[settingId];

        // Skip if the new setting is undefined
        if (typeof newSetting === 'undefined') continue;

        const isNumber = typeof oldSetting === 'number' && typeof newSetting === 'number';
        const valuesAreDifferent = isNumber
          ? Math.abs(oldSetting - newSetting) > 1e-10 // Compare with a small tolerance
          : oldSetting !== newSetting;

        if (valuesAreDifferent) {
          this.log(`Setting ID: ${settingId}. Old setting: ${oldSetting}, New Setting: ${newSetting}`);
          changed = true;
        }
      }

      if (changed) {
        await this.setSettings(refreshedData.settings);
      }
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');

    // Sync (new) device name with Iungo
    let deviceData = this.getData();
    return (this.homey.app as IungoApp).save(deviceData.iungo_id, deviceType, deviceData.id, 'name', this.getName());
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name: string) {
    this.log('MyDevice was renamed');

    // Sync (new) device name with Iungo
    let deviceData = this.getData();
    return (this.homey.app as IungoApp).save(deviceData.iungo_id, deviceType, deviceData.id, 'name', name);
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: {
      [key: string]: boolean | string | number | undefined | null;
    };
    newSettings: {
      [key: string]: boolean | string | number | undefined | null;
    };
    changedKeys: string[];
  }): Promise<string | void> {
    let deviceData = this.getData();

    this.log(
      'Changed settings: ' + JSON.stringify(deviceData) + ' / new = ' + JSON.stringify(newSettings) + ' / old = ' + JSON.stringify(oldSettings) + ' / changedKeys = ' + JSON.stringify(changedKeys),
    );

    changedKeys.forEach((key: any) => {
      (this.homey.app as IungoApp).save(deviceData.iungo_id, deviceType, deviceData.id, 'settings', { key: key, value: newSettings[key] });
    });

    return;
  }
};
