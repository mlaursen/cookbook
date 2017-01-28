/* eslint-env jest */
jest.mock('../../utils/generateETag');

import reducer, {
  CREATE_ETAG, createETag,
  UPDATE_ETAG, updateETag,
  DELETE_ETAG, deleteETag,
} from '../etags';

describe('etags', () => {
  describe('action creators', () => {
    describe('createETag', () => {
      it('should create an action to create an etag', () => {
        const route = '/users/3';
        const entity = { id: 3, firstName: 'Bob', lastName: 'Bobbity' };
        const expected = {
          type: CREATE_ETAG,
          payload: { route, entity },
        };

        expect(createETag(route, entity)).toEqual(expected);
      });
    });

    describe('updateETag', () => {
      it('should create an action to update an etag', () => {
        const route = '/testing/';
        const entity = { id: 1, test: 'Tester' };
        const expected = {
          type: UPDATE_ETAG,
          payload: { route, entity },
        };

        expect(updateETag(route, entity)).toEqual(expected);
      });
    });

    describe('deleteETag', () => {
      it('should create an action to delete an etag', () => {
        const route = '/testing/1';
        const expected = {
          type: DELETE_ETAG,
          payload: { route },
        };

        expect(deleteETag(route)).toEqual(expected);
      });
    });
  });

  describe('reducers', () => {
    it('should return the initial state', () => {
      expect(reducer(undefined, {})).toEqual({});
    });

    it('should be able to create an etag', () => {
      const entity = { id: 1, name: 'Hello' };
      const action = {
        type: CREATE_ETAG,
        payload: { route: '/testing/1', entity },
      };

      const expected = {
        '/testing/1': '"abcd1234"',
      };

      expect(reducer({}, action)).toEqual(expected);
    });

    it('should be able to create an etag without discarding other etags', () => {
      const state = {
        '/testing/1': '"abcd1234"',
        '/testing/2': '"abcd1234"',
      };
      const entity = { id: 8039, name: 'Something' };

      const action = { type: CREATE_ETAG, payload: { route: '/testing/8039', entity } };
      const expected = {
        '/testing/1': '"abcd1234"',
        '/testing/2': '"abcd1234"',
        '/testing/8039': '"abcd1234"',
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should be able to update an etag', () => {
      const state = {
        '/testing/32': '"existing_etag"',
      };
      const action = {
        type: UPDATE_ETAG,
        payload: { route: '/testing/32', entity: { id: 32, name: 'Woop' } },
      };

      const expected = {
        '/testing/32': '"abcd1234"',
      };
      expect(reducer(state, action)).toEqual(expected);
    });

    it('should be able to update an etag without discarding other etags', () => {
      const state = {
        '/testing/100': '"abcd1234"',
        '/testing/3424': '"abcd1234"',
        '/testing/8039': '"existing_etag"',
      };
      const entity = { id: 8039, name: 'Something' };

      const action = { type: CREATE_ETAG, payload: { route: '/testing/8039', entity } };
      const expected = {
        '/testing/100': '"abcd1234"',
        '/testing/3424': '"abcd1234"',
        '/testing/8039': '"abcd1234"',
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should be able to delete an etag', () => {
      const state = {
        '/testing/3': '"abcd1234"',
      };
      const action = { type: DELETE_ETAG, payload: { route: '/testing/3' } };

      expect(reducer(state, action)).toEqual({});
    });

    it('should be able to delete an etag without discarding other etags', () => {
      const state = {
        '/testing/100': '"abcd1234"',
        '/testing/3424': '"abcd1234"',
        '/testing/8039': '"abcd1234"',
      };

      const action = { type: DELETE_ETAG, payload: { route: '/testing/8039' } };
      const expected = {
        '/testing/100': '"abcd1234"',
        '/testing/3424': '"abcd1234"',
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
