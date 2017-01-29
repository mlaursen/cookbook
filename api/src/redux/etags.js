/** @module redux/etags */
import { omit } from 'lodash';
import generateETag from '../utils/generateETag';

export const CREATE_ETAG = Symbol('CREATE_ETAG');
export const UPDATE_ETAG = Symbol('UPDATE_ETAG');
export const DELETE_ETAG = Symbol('DELETE_ETAG');

/**
 * The action creator for creating a new etag in the store.
 *
 * @param {String} route - The store key to associate with the current entity.
 * @param {Object} entity - The entity to create an etag for.
 * @return {Object} the action creator object.
 */
export function createETag(route, entity) {
  return { type: CREATE_ETAG, payload: { route, entity } };
}

/**
 * The action creator for updating a new etag in the store.
 *
 * @param {String} route - The store key to associate with the current entity.
 * @param {Object} entity - The entity to create an etag for.
 * @return {Object} the action creator object.
 */
export function updateETag(route, entity) {
  return { type: UPDATE_ETAG, payload: { route, entity } };
}

/**
 * The action creator for deleting an etag in the store.
 *
 * @param {String} route - The store key to associate with the current entity.
 * @return {Object} the action creator object.
 */
export function deleteETag(route) {
  return { type: DELETE_ETAG, payload: { route } };
}

function createOrUpdateETag(state, { route, entity }) {
  return { ...state, [route]: generateETag(entity) };
}

function handleETagDelete(state, { route }) {
  return omit(state, route);
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
