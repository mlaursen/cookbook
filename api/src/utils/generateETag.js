import etag from 'etag';
import { omit } from 'lodash';
import { META_FIELDS } from '../constants';

export default function generateETag(entity) {
  return etag(JSON.stringify(omit(entity, META_FIELDS)));
}
