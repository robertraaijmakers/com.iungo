'use strict';

import { request } from 'undici';
import { RequestOptions, RequestResponse } from '../types/apiRequestTypes';

export async function httpRequest(options: RequestOptions): Promise<RequestResponse> {
  const { body, protocol = 'https', ...requestOptions } = options;

  const url = `${protocol}://${requestOptions.hostname}${requestOptions.path}`;

  const response = await request(url, {
    method: requestOptions.method,
    headers: requestOptions.headers,
    body,
  });

  let responseBody = await response.body.text();

  try {
    responseBody = JSON.parse(responseBody);
  } catch {}

  return { body: responseBody, headers: response.headers };
}
