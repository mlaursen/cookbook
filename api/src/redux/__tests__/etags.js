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
        const id = 3;
        const route = 'users';
        const entity = { id, firstName: 'Bob', lastName: 'Bobbity' };
        const expected = {
          type: CREATE_ETAG,
          payload: { id, route, entity },
        };

        expect(createETag(id, route, entity)).toEqual(expected);
      });
    });

    describe('updateETag', () => {
      it('should create an action to update an etag', () => {
        const id = 1;
        const route = 'testing';
        const entity = { id, test: 'Tester' };
        const expected = {
          type: UPDATE_ETAG,
          payload: { id, route, entity },
        };

        expect(updateETag(id, route, entity)).toEqual(expected);
      });
    });

    describe('deleteETag', () => {
      it('should create an action to delete an etag', () => {
        const id = 32032;
        const route = 'testing';
        const expected = {
          type: DELETE_ETAG,
          payload: { id, route },
        };

        expect(deleteETag(id, route)).toEqual(expected);
      });
    });
  });

  describe('reducers', () => {
    it('should return the initial state', () => {
      expect(reducer(undefined, {})).toEqual({});
    });

    it('should be able to create an etag', () => {
      const id = 3;
      const entity = { id, name: 'Hello' };
      const action = {
        type: CREATE_ETAG,
        payload: { id, route: 'testing', entity },
      };

      const expected = {
        testing: { 3: '"abcd1234"' },
      };

      expect(reducer({}, action)).toEqual(expected);
    });

    it('should be able to create an etag without discarding other etags', () => {
      const state = {
        routing: { 100: '"abcd1234"' },
        testing: { 3424: '"abcd1234"' },
      };
      const id = 8039;
      const entity = { id, name: 'Something' };

      const action = { type: CREATE_ETAG, payload: { id, route: 'testing', entity } };
      const expected = {
        routing: { 100: '"abcd1234"' },
        testing: {
          3424: '"abcd1234"',
          8039: '"abcd1234"',
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should be able to update an etag', () => {
      const id = 32;
      const state = { testing: { 32: '"existing_etag"' } };
      const action = {
        type: UPDATE_ETAG,
        payload: { id, route: 'testing', entity: { id, name: 'Woop' } },
      };

      const expected = { testing: { 32: '"abcd1234"' } };
      expect(reducer(state, action)).toEqual(expected);
    });

    it('should be able to update an etag without discarding other etags', () => {
      const state = {
        routing: { 100: '"abcd1234"' },
        testing: { 3424: '"abcd1234"', 8039: '"existing_etag"' },
      };
      const id = 8039;
      const entity = { id, name: 'Something' };

      const action = { type: CREATE_ETAG, payload: { id, route: 'testing', entity } };
      const expected = {
        routing: { 100: '"abcd1234"' },
        testing: {
          3424: '"abcd1234"',
          8039: '"abcd1234"',
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should be able to delete an etag', () => {
      const state = { testing: { 3: '"abcd1234"' } };
      const action = { type: DELETE_ETAG, payload: { id: 3, route: 'testing' } };

      expect(reducer(state, action)).toEqual({ testing: {} });
    });

    it('should be able to delete an etag without discarding other etags', () => {
      const state = {
        routing: { 100: '"abcd1234"' },
        testing: { 3424: '"abcd1234"', 8039: '"abcd1234"' },
      };

      const action = { type: DELETE_ETAG, payload: { id: 8039, route: 'testing' } };
      const expected = {
        routing: { 100: '"abcd1234"' },
        testing: {
          3424: '"abcd1234"',
        },
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
