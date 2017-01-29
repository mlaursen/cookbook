/** @module redux/counts */

export const SET_COUNT = Symbol('SET_COUNT');

/**
 * Creates an action to set the count for a route to the given number.
 * @param {String} route - The route to set a count for.
 * @param {number} count - The new total count for the route.
 * @return {Object} the action creator object.
 */
export function setCount(route, count) {
  return { type: SET_COUNT, payload: { route, count } };
}

export default function counts(state = {}, action) {
  if (action.type === SET_COUNT) {
    const { route, count } = action.payload;
    return { ...state, [route]: count };
  }

  return state;
}
