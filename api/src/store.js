import { createStore, combineReducers } from 'redux';
import { get } from 'lodash';

import counts from './redux/counts';
import etags from './redux/etags';

const store = createStore(combineReducers({
  counts,
  etags,
}));
export default store;

export function getETag(id, route) {
  return get(store.getState(), `etags.${route}.${id}`);
}

export function getCount(route) {
  return get(store.getState(), `counts.${route}`, 0);
}
