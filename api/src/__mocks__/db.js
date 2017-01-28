/* eslint-env jest */
import Promise from 'bluebird';
import { get } from 'lodash';

const VALID_SELECT = 'select * from Item where id = $<id>';
const VALID_CREATE = 'insert into Item(name) values ($<name>) returning id';
const VALID_UPDATE = 'update Item set name = $<name> where id = $<id>';
const VALID_DELETE = 'delete from Item where id = $<id>';

export default {
  oneOrNone: jest.fn((query, params) => new Promise(resolve => {
    if (query === VALID_SELECT && get(params, 'id', '').toString() === '1') {
      resolve({ id: 1, name: 'Item 1', created_dt: 'Today', updated_dt: null });
    } else if (query === VALID_SELECT && get(params, 'id', '').toString() === '2') {
      resolve({ id: 2, name: 'Item 2', created_dt: 'Today', updated_dt: 'Later Today' });
    } else {
      resolve(null);
    }
  })),
  one: jest.fn((query, params) => new Promise(resolve => {
    if (query === VALID_CREATE && params && params.name !== 'BreakMe') {
      resolve({ id: 1000 });
    } else {
      resolve(null);
    }
  })),
  result: jest.fn((query, params) => new Promise(resolve => {
    if ((query === VALID_UPDATE || query === VALID_DELETE) && get(params, 'id', '').toString() === '1') {
      resolve({ rowCount: 1 });
    } else {
      resolve({});
    }
  })),
};
