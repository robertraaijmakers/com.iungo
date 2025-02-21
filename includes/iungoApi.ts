'use strict';

import { httpRequest } from '../lib/helpers';
import { RequestOptions } from '../types/apiRequestTypes';

/*
 * The Iungo API handler
 */
export class IungoApi {
  username: string;
  password: string;
  options: { url: string };
  sequence: number;

  #log: (...args: any[]) => void;

  constructor(username: string, password: string, uri: string, log: (...args: any[]) => void) {
    this.username = username;
    this.password = password;
    this.options = { url: uri || 'http://10.0.0.1' };
    this.sequence = 1;

    this.#log = log || console.log;
  }

  async call(api_method: string, api_arguments: {} | null) {
    this.sequence += 1;

    // Prevent int overflow
    if (this.sequence >= 999999999) {
      this.sequence = 1;
    }

    const apiMethod = api_method || '';
    const apiArguments = api_arguments || {};

    const body = JSON.stringify({
      seq: this.sequence,
      method: apiMethod,
      arguments: apiArguments,
    });

    const opts: RequestOptions = {
      protocol: 'http',
      hostname: this.options.url.replace('http://', ''),
      path: '/iungo/api_request/',
      method: 'POST',
      body: body,
    };

    const response = await httpRequest(opts);

    if (response === null || response === undefined) {
      this.#log('No response from Iungo');
      return [];
    }

    const bodyValue = <any>response.body;
    if (bodyValue.ok !== true) {
      this.#log('Invalid bodyValue: ' + JSON.stringify(bodyValue));
      return [];
    }

    return bodyValue.rv;
  }

  async getDevices() {
    return this.call('objmgr_get_objects_init', null);
  }

  async getDevice(oid: string) {
    const args = {
      oid: oid,
    };

    return this.call('objmgr_get_objects_init', args);
  }

  async setDeviceName(oid: string, newName: string) {
    const args = {
      oid: oid,
      prop: 'name',
      value: newName,
    };

    return this.call('object_prop_set', args);
  }

  async setDeviceOnOff(oid: string, state: boolean) {
    const args = {
      oid: oid,
      prop: 'command',
      value: state === true ? 'on' : 'off',
    };

    return this.call('object_prop_set', args);
  }

  async setDeviceSettings(oid: string, props: { key: string; value: string }) {
    var args = {
      oid: oid,
      prop: props['key'],
      value: props['value'],
    };

    return this.call('object_prop_set', args);
  }
}
