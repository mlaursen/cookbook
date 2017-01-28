import { createStore, combineReducers } from 'redux';

import counts from './counts';
import etags from './etags';

export default createStore(combineReducers({
  counts,
  etags,
}));
