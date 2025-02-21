'use strict';

import Homey from 'homey';
import { IungoDiscover } from './includes/iungoDiscover';
import { IungoRouter } from './includes/iungoRouter';
import { HomeyIungoDevice, IungoBase, IungoDevice } from './types/types';

const findIungosInterval = 600000;
const iungoRefreshInterval = 5000;

module.exports = class IungoApp extends Homey.App {
  iungos: { [key: string]: IungoRouter } = {};

  async onInit() {
    this.setMaxListeners(0);
    this.iungos = {};

    await this.findIungos();

    this.homey.setInterval(() => {
      this.findIungos();
    }, findIungosInterval);

    this.homey.setInterval(() => {
      this.refreshIungos();
    }, iungoRefreshInterval);
  }

  async findIungos() {
    // If manual IP is set
    if (this.homey.settings.get('manualIp')) {
      this.log('Reading manually set IPs');
      const iungoIps = this.homey.settings.get('iungoIps');

      if (iungoIps && Object.keys(iungoIps).length > 0) {
        let counter = 1;

        (Object.values(iungoIps) as string[]).forEach(async (ip: string) => {
          const iungo = {
            id: `abc-${counter}23`,
            ip: 'http://' + ip,
          };

          counter += 1;
          await this.initIungo(iungo);
        });
      }

      return;
    }

    // Otherwise start normal discovery
    var discovery = new IungoDiscover();
    try {
      var discoverResult = await discovery.discover();
      this.log('Discover result: ', discoverResult);

      if (discoverResult === null) {
        return;
      }

      const iungo = {
        id: 'abc-123',
        ip: 'http://' + discoverResult,
      };

      await this.initIungo(iungo);
    } catch (err) {
      this.log('Error while discovering iungo: ' + err);
    }
  }

  async initIungo(iungo: IungoBase) {
    this.log('Init iungo: ', iungo);

    // Skip if already found but update ip if changed
    if (this.iungos[iungo.id] instanceof IungoRouter) {
      if (this.iungos[iungo.id].address !== iungo.ip) {
        this.log(`Iungo ip has changed from ${this.iungos[iungo.id].address} to ${iungo.ip}`);
        this.iungos[iungo.id].setAddress(iungo.ip);
      }

      return;
    }

    console.log('Found iungo');
    this.log(`Found iungo ${iungo.id} @ ${iungo.ip}`);

    this.iungos[iungo.id] = new IungoRouter(iungo.id, iungo.ip, this.log);
  }

  async refreshIungos() {
    const devicesData: { [id: string]: IungoDevice } = await Promise.allSettled(
      Object.values(this.iungos).map(async (iungo) => {
        try {
          const refreshedData = await iungo.refreshData();
          return { status: 'fulfilled', value: refreshedData };
        } catch (error) {
          this.log(`Error while refreshing iungo (${iungo.address}): ${error}`);
          return { status: 'rejected', reason: error };
        }
      }),
    ).then((results) =>
      results.reduce((acc, result) => {
        if (result.status === 'fulfilled' && result.value && typeof result.value === 'object' && result.value.value) {
          Object.values(result.value.value).forEach((device) => {
            acc[device.uniqueId] = device; // Ensure we use device.id as the key
          });
        }
        return acc;
      }, {} as { [id: string]: IungoDevice }),
    );

    // Loop through all devices and refresh them
    const drivers = Object.values(this.homey.drivers.getDrivers());
    drivers.forEach((driver: any) => {
      const devices = driver.getDevices();

      devices.forEach(async (device: HomeyIungoDevice) => {
        if (device instanceof Error) {
          this.log('Error while refreshing iungos: ' + device);
          return;
        }

        // Find data from device
        const deviceData = device.getData();
        const refreshedData = devicesData[`${deviceData.iungo_id}-${deviceData.id}`];
        if (!refreshedData) {
          this.log(`Couldn't find refreshed data for device with id ${deviceData.iungo_id}-${deviceData.id}`);
          return;
        }

        // Call the synchronize function from the device
        await device.syncDevice(refreshedData);
      });
    });
  }

  async save(iungoId: string, deviceType: string, deviceId: string, action: string, value: any) {
    // Find the iungo
    const iungo = this.iungos[iungoId];
    if (!iungo) {
      this.log(`Iungo with id ${iungoId} not found`);
      throw new Error(`Can't save device settings. Iungo with id ${iungoId} not found.`);
    }

    // Save the device settings
    var result = await iungo.save(deviceType, deviceId, action, value);
    this.log('Save result: ', result);
    return result;
  }

  async getIungos() {
    return this.iungos;
  }
};
