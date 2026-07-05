import { initClient } from '@ts-rest/core';
import { contract } from '@astra/shared';

export const client = initClient(contract, {
  baseUrl: '',
  baseHeaders: {},
});
