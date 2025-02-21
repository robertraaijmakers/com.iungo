'use strict';

import { IncomingHttpHeaders } from 'http';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface RequestOptions {
  body?: string | Buffer;
  protocol?: 'http' | 'https';
  hostname: string;
  path: string;
  method: HttpMethod;
  headers?: string[] | IncomingHttpHeaders | null | undefined;
  rejectUnauthorized?: boolean;
}

export interface RequestResponse {
  body: string | object;
  headers: Record<string, string | string[] | undefined>;
}
