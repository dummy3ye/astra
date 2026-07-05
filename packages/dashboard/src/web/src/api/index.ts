import { initClient } from '@ts-rest/core';
import { contract } from '@gallium/shared';

export const client = initClient(contract, {
  baseUrl: '',
  baseHeaders: {},
});
