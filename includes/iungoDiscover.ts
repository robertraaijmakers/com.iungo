'use strict';

import { httpRequest } from '../lib/helpers';
import { RequestOptions } from '../types/apiRequestTypes';

/*
 * Discover class
 */
export class IungoDiscover {
  constructor() {}

  async discover() {
    const options: RequestOptions = {
      protocol: 'http',
      hostname: 'www.atedec.com',
      path: '/iungo/myiungoip/',
      method: 'GET',
    };

    const response = await httpRequest(options);
    return response.body;
  }
}
