/* eslint-env jest */
import reducer, { SET_COUNT, setCount } from '../counts';

describe('counts', () => {
  describe('action creators', () => {
    describe('setCount', () => {
      it('should create an action to set the count', () => {
        const route = 'testing';
        const count = 30;
        const expected = { type: SET_COUNT, payload: { route, count } };
        expect(setCount(route, count)).toEqual(expected);
      });
    });
  });

  describe('reducers', () => {
    it('should return the initial state', () => {
      expect(reducer(undefined, {})).toEqual({});
    });

    it('should be able to set a count for a new route', () => {
      const action = { type: SET_COUNT, payload: { route: 'testing', count: 32 } };
      const expected = { testing: 32 };
      expect(reducer({}, action)).toEqual(expected);
    });

    it('should be able to set a count for a new route without removing other routes', () => {
      const initialState = { other: 30 };
      const action = { type: SET_COUNT, payload: { route: 'testing', count: 32 } };
      const expected = { testing: 32, other: 30 };
      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should be able to set a count for an existing route', () => {
      const initialState = { testing: 30 };
      const action = { type: SET_COUNT, payload: { route: 'testing', count: 0 } };
      const expected = { testing: 0 };
      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should be able to set a count for an existing route without removing other routes', () => {
      const initialState = { other: 10, testing: 30 };
      const action = { type: SET_COUNT, payload: { route: 'testing', count: 0 } };
      const expected = { other: 10, testing: 0 };
      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
