'use strict';

import { IungoApp } from './types/types';

module.exports = {
  async getIungos({ homey, query }: { homey: any; query: any }) {
    const app = <IungoApp>homey.app;

    if (query.rediscover === 'true') {
      app.log('Rediscover started.');
      await app.findIungos();
    }

    return app.getIungos();
  },
};
