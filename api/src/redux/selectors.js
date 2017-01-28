import { get } from 'lodash';

import store from './store';

export function getETag(route) {
  return get(store.getState(), `etags.${route}`);
}

export function getCount(route) {
  return get(store.getState(), `counts.${route}`);
}
