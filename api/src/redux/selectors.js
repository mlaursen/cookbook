/** @module redux/selectors */
import { get } from 'lodash';

import store from './store';

/**
 * Retrieves an etag from the store for the given route.
 *
 * @param {String} route - the route to get for
 * @return {String} the etag for the route or null.
 */
export function getETag(route) {
  return get(store.getState(), `etags.${route}`, null);
}

/**
 * Retrieves a count of items for a route.
 *
 * @param {String} route - the route to get for
 * @return {number} the total results for the route.
 */
export function getCount(route) {
  return get(store.getState(), `counts.${route}`);
}
