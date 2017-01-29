/** @module utils/generateETag */
import etag from 'etag';
import { omit } from 'lodash';
import { META_FIELDS } from '../constants';

/**
 * A simple untility function that will generate an etag
 * for an entity in the database. It will omit the metadata
 * fields from the result before making the etag.
 *
 * @param {Object} entity - The entity to create an etag for.
 * @return {String} the generated etag.
 */
export default function generateETag(entity) {
  return etag(JSON.stringify(omit(entity, META_FIELDS)));
}
