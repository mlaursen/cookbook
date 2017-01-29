/** @module redux/store */
import { createStore, combineReducers } from 'redux';

import counts from './counts';
import etags from './etags';

/**
 * This is just the main redux store for the api
 */
export default createStore(combineReducers({
  counts,
  etags,
}));
