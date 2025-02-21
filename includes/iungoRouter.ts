'use strict';

import { IungoApi } from './iungoApi';
import { IungoDevice } from '../types/types';

const energyMeterCapabilitiesMap = {
  gas: 'meter_gas',
  gas_usage: 'measure_gas',
  usage: 'measure_power',
  T1: 'meter_power.t1',
  T2: 'meter_power.t2',
  '-T1': 'meter_power.rt1',
  '-T2': 'meter_power.rt2',
  L1I: 'measure_current.l1',
  L2I: 'measure_current.l2',
  L3I: 'measure_current.l3',
  L1Pimp: 'measure_power.l1i',
  L2Pimp: 'measure_power.l2i',
  L3Pimp: 'measure_power.l3i',
  L1Pexp: 'measure_power.l1e',
  L2Pexp: 'measure_power.l2e',
  L3Pexp: 'measure_power.l3e',
};

const energyMeterSettingsMap = {
  'Cost-T1': 'Cost-T1',
  'Cost-T2': 'Cost-T2',
  'Cost-nT1': 'Cost-nT1',
  'Cost-nT2': 'Cost-nT2',
  'Cost-gas': 'Cost-gas',
  'Gas-interval': 'Gas-interval',
};

export class IungoRouter {
  client: IungoApi;

  icon: string;
  modelName: string;
  modelId: string;
  name: string;
  address: string;
  id: string;

  #log: (...args: any[]) => void;

  constructor(id: string, address: string, log: (...args: any[]) => void) {
    // Set device data
    this.id = id;
    this.address = address;
    this.name = 'IungoBox';
    this.modelId = 'default';
    this.modelName = '';
    this.icon = `/assets/images/routers/${this.modelId}.svg`;

    this.#log = log || console.log;

    this.client = new IungoApi('', '', address, this.#log);
  }

  setAddress(address: string) {
    this.address = address;

    if (typeof this.client === 'undefined') {
      return;
    }

    this.client.options.url = address;
  }

  /*
		Save actions for devices
	*/
  async save(type: string, objectId: string, action: string, value: any) {
    switch (action) {
      case 'name':
        this.#log('Setting name for ', objectId, value);
        return this.client.setDeviceName(objectId, value);
      case 'settings':
        this.#log('Setting settings for ', objectId, value);
        return this.client.setDeviceSettings(objectId, value);
    }

    if (type === 'energy_meter') return this.savePower(objectId, action, value);
    if (type === 'water_meter') return this.saveWater(objectId, action, value);
    if (type === 'socket') return this.saveSocket(objectId, action, value);
    if (type === 'solar_meter') return this.saveSolarMeter(objectId, action, value);

    return new Error('invalid_type');
  }

  async savePower(objectId: string, action: string, value: string | boolean) {
    return false;
  }

  async saveWater(objectId: string, action: string, value: string | boolean) {
    return false;
  }

  async saveSolarMeter(objectId: string, action: string, value: string | boolean) {
    return false;
  }

  async saveSocket(objectId: string, action: string, value: string | boolean) {
    switch (action) {
      case 'onoff':
        return await this.client.setDeviceOnOff(objectId, <boolean>value);
    }

    return false;
  }

  /*
	Refresh Data
	*/
  async refreshData() {
    this.#log('_refreshDevices');

    // Refresh all devices and their information.
    const response = await this.client.getDevices();
    let deviceData: { [key: string]: IungoDevice } = {};

    if (response === null) {
      return deviceData;
    }

    for (var obj in response.objects) {
      var device = response.objects[obj];

      if (device.type.indexOf('energy') !== -1) {
        // Energy meter, fill all values
        let meter = this.#parseEnergyMeterValues(device.oid, device.name, device.driver, device.propsval);
        deviceData[meter.uniqueId] = meter;
      } else if (device.type.indexOf('water') !== -1) {
        // Water meter
        let meter = this.#parseWaterMeterValues(device.oid, device.name, device.driver, device.propsval);
        deviceData[meter.uniqueId] = meter;
      } else if (device.type.indexOf('powerswitch') !== -1) {
        // Wall socket
        let socket = this.#parseSocketValues(device.oid, device.name, device.driver, device.propsval);
        deviceData[socket.uniqueId] = socket;
      } else if (device.type.indexOf('solar') !== -1) {
        // Solar
        let meter = this.#parseSolarMeterValues(device.oid, device.name, device.driver, device.propsval);
        deviceData[meter.uniqueId] = meter;
      }
    }

    return deviceData;
  }

  #parseEnergyMeterValues(oid: string, name: string, driver: string, properties: { id: string; value: any }[]) {
    // Register device variables
    let energyMeter: IungoDevice = {
      id: oid,
      uniqueId: `${this.id}-${oid}`,
      name: name,
      modelId: driver.replace('energy-', '').replace('energymeter-', ''),
      present: true,
      type: 'energy_meter',
      settings: {
        'Cost-T1': '0.0',
        'Cost-T2': '0.0',
        'Cost-nT1': '0.0',
        'Cost-nT2': '0.0',
        'Cost-gas': '0.0',
        'Gas-interval': '0',
      },
      capabilities: {},
    };

    let measurePowerImport = 0;
    let measurePowerExport = 0;
    let meterPowerImported = 0;
    let meterPowerExported = 0;

    for (let obj in properties) {
      let property = properties[obj];

      if (Object.keys(energyMeterCapabilitiesMap).includes(property.id)) {
        energyMeter.capabilities[energyMeterCapabilitiesMap[property.id as keyof typeof energyMeterCapabilitiesMap]] = property.value;
      }

      // Check if property.id is a valid key in energyMeterSettingsMap
      if (Object.keys(energyMeterSettingsMap).includes(property.id)) {
        const energyMeterSettingProperty = energyMeterSettingsMap[property.id as keyof typeof energyMeterSettingsMap];
        (energyMeter['settings'][energyMeterSettingProperty as keyof typeof energyMeterSettingsMap] as any) = property.value;
      }

      if (property.id == 'T1' || property.id == 'T2') {
        meterPowerImported += property.value;
      }

      if (property.id == '-T1' || property.id == '-T2') {
        meterPowerExported += property.value;
      }

      if (property.id == 'L1Pimp' || property.id == 'L2Pimp' || property.id == 'L3Pimp') {
        energyMeter.capabilities[energyMeterCapabilitiesMap[property.id as keyof typeof energyMeterCapabilitiesMap]] = property.value * 1000;
        measurePowerImport += property.value;
      }

      if (property.id == 'L1Pexp' || property.id == 'L2Pexp' || property.id == 'L3Pexp') {
        energyMeter.capabilities[energyMeterCapabilitiesMap[property.id as keyof typeof energyMeterCapabilitiesMap]] = property.value * 1000;
        measurePowerExport += property.value;
      }
    }

    energyMeter.capabilities['measure_power.import'] = measurePowerImport * 1000;
    energyMeter.capabilities['measure_power.export'] = measurePowerExport * 1000;

    if (meterPowerImported > 0) {
      energyMeter.capabilities['meter_power.imported'] = meterPowerImported;
    }

    if (meterPowerExported > 0) {
      energyMeter.capabilities['meter_power.exported'] = meterPowerExported;
    }

    // Combine meter_power.imported and meter_power.exported into the standard meter_power capability
    if (meterPowerExported > 0 || meterPowerImported > 0) {
      energyMeter.capabilities['meter_power'] = meterPowerImported - meterPowerExported;
    }

    return energyMeter;
  }

  #parseWaterMeterValues(oid: any, name: any, driver: string, properties: { [x: string]: any }) {
    // Register device variables
    let waterMeter: IungoDevice = {
      id: oid,
      uniqueId: `${this.id}-${oid}`,
      name: name,
      modelId: driver.replace('water-', ''),
      present: true,
      type: 'water_meter',
      settings: {
        offset: 0,
      },
      capabilities: {},
    };

    var offset = null;
    var pulstotal = null;
    var kfact = null;

    for (var obj in properties) {
      var property = properties[obj];
      switch (property.id) {
        case 'flow':
          waterMeter.capabilities['measure_water'] = property.value;
          break;
        case 'offset':
          offset = property.value;
          waterMeter['settings']['offset'] = property.value;
          break;
        case 'pulstotal':
          pulstotal = property.value;
          break;
        case 'kfact':
          kfact = property.value;
          break;
      }
    }

    if (offset !== null && pulstotal !== null && kfact !== null) {
      waterMeter.capabilities['meter_water'] = offset + pulstotal / kfact;
    }

    return waterMeter;
  }

  #parseSocketValues(oid: string, name: string, driver: string, properties: any) {
    let socket: IungoDevice = {
      id: oid,
      uniqueId: `${this.id}-${oid}`,
      name: name,
      modelId: driver.replace('powerswitch-', ''),
      present: true,
      type: 'socket',
      settings: {},
      capabilities: {},
    };

    for (var obj in properties) {
      var property = properties[obj];

      switch (property.id) {
        case 'usage':
          socket.capabilities['measure_power'] = property.value;
          break;
        case 'available':
          socket.present = property.value;
          break;
        case 'state':
          socket.capabilities['onoff'] = property.value === 'on';
          break;
      }
    }

    return socket;
  }

  #parseSolarMeterValues(oid: string, name: string, driver: string, properties: any) {
    // Register device variables
    let solarMeter: IungoDevice = {
      id: oid,
      uniqueId: `${this.id}-${oid}`,
      name: name,
      modelId: 'solar',
      present: true,
      type: 'solar_meter',
      settings: {
        offset: 0,
      },
      capabilities: {},
    };

    var offset = null;
    var pulstotal = null;
    var ppkwh = null;
    var importMeter = null;
    var exportMeter = null;

    for (var obj in properties) {
      var property = properties[obj];

      switch (property.id) {
        case 'solar':
          solarMeter.capabilities['measure_power'] = property.value;
          break;
        case 'offset':
          offset = property.value;
          solarMeter['settings']['offset'] = property.value;
          break;
        case 'import':
          importMeter = property.value;
          solarMeter.capabilities['meter_power.imported'] = importMeter;
          break;
        case 'export':
          exportMeter = property.value;
          solarMeter.capabilities['meter_power.exported'] = exportMeter;
          break;
        case 'pulstotal':
          pulstotal = property.value;
          break;
        case 'ppkwh':
          ppkwh = property.value;
          break;
      }
    }

    // For modbus kWh meters: Solar panels consume energy and produce energy, combine into default meter_power capability
    if (importMeter !== null && exportMeter !== null) {
      solarMeter.capabilities['meter_power'] = exportMeter - importMeter;
    }

    // In case of pulse energy measurement devices, determine the energy meter state based on offset + (pulstotal / ppkwh)
    if (offset !== null && pulstotal !== null && ppkwh !== null) {
      solarMeter.capabilities['meter_power'] = offset + pulstotal / ppkwh;
    }

    return solarMeter;
  }
}
