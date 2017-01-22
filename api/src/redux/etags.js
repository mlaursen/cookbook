import { omit } from 'lodash';
import generateETag from '../utils/generateETag';

export const CREATE_ETAG = Symbol('CREATE_ETAG');
export const UPDATE_ETAG = Symbol('UPDATE_ETAG');
export const DELETE_ETAG = Symbol('DELETE_ETAG');

/**
 * The action creator for creating a new etag in the store.
 *
 * @param {String|number} id - The id for the etag
 * @param {String} route - The store key to associate with the current entity.
 * @param {Object} entity - The entity to create an etag for.
 * @return {Object} the action creator object.
 */
export function createETag(id, route, entity) {
  return { type: CREATE_ETAG, payload: { id, route, entity } };
}

/**
 * The action creator for updating a new etag in the store.
 *
 * @param {String|number} id - The id for the etag
 * @param {String} route - The store key to associate with the current entity.
 * @param {Object} entity - The entity to create an etag for.
 * @return {Object} the action creator object.
 */
export function updateETag(id, route, entity) {
  return { type: UPDATE_ETAG, payload: { id, route, entity } };
}

/**
 * The action creator for deleting an etag in the store.
 *
 * @param {String|number} id - The id for the etag
 * @param {String} route - The store key to associate with the current entity.
 * @return {Object} the action creator object.
 */
export function deleteETag(id, route) {
  return { type: DELETE_ETAG, payload: { id, route } };
}

function createOrUpdateETag(state, { id, route, entity }) {
  return {
    ...state,
    [route]: {
      ...state[route],
      [id]: generateETag(entity),
    },
  };
}

function handleETagDelete(state, { id, route }) {
  return { ...state, [route]: omit(state[route], id) };
}


export default function reducer(state = {}, action) {
  switch (action.type) {
    case CREATE_ETAG:
    case UPDATE_ETAG:
      return createOrUpdateETag(state, action.payload);
    case DELETE_ETAG:
      return handleETagDelete(state, action.payload);
    default:
      return state;
  }
}
