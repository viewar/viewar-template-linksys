import {compose} from 'stampit';

import intersection from 'lodash/intersection';
import difference from 'lodash/difference';
import xor from 'lodash/xor';

/**
 * @interface Taggable
 */
export const Taggable = compose({

  initializers: [function ({tags}) {
    this.tags = tags || this.tags;
  }],

  deepProperties: {
    /**
     * @member {string[]} tags tags describing the object
     * @memberof Taggable#
     */
    tags: []
  },

  methods: {
    hasAnyTag,
    hasAllTags,
    hasExactTags
  }

});

/**
 * Checks if the object has any of the provided tags.
 * @memberof Taggable#
 * @param {string[]} tags
 * @returns {boolean}
 */
function hasAnyTag(tags) {
  return !!intersection(tags, this.tags).length;
}

/**
 * Checks if the object has all of the provided tags. The object may have more tags than that.
 * @memberof Taggable#
 * @param {string[]} tags
 * @returns {boolean}
 */
function hasAllTags(tags) {
  return !difference(tags, this.tags).length;
}

/**
 * Checks if the object has exactly the provided tags, no more or less.
 * @memberof Taggable#
 * @param {string[]} tags
 * @returns {boolean}
 */
function hasExactTags(tags) {
  return !xor(tags, this.tags).length;
}
