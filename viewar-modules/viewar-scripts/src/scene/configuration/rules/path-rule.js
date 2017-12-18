import compose from 'stampit/compose';

import { PATH_SEPARATOR } from '../../../constants';
import { fail } from '../../../utils/utils';

import zip from 'lodash/zip';
import trim from 'lodash/trim';

const SEGMENT_WILDCARD = '*';
const REGEXP_DELIMITER = '/';

export const PathRule = compose({

  initializers: [function ({segmentMatchers}) {
    this.segmentMatchers = segmentMatchers || fail('Parameter "segmentMatchers" must be an array!');
  }],

  staticProperties: {
    PATH_SEPARATOR,
    SEGMENT_WILDCARD,
    REGEXP_DELIMITER,
  },

  methods: {
    matches,
  }

});

function matches(option) {
  return zip(option.path, this.segmentMatchers)
      .every(([pathSegment, segmentMatcher]) => pathSegment && segmentMatcher(pathSegment));
}

function createSegmentMatcher(matcherExpression) {
  if (isRegExp(matcherExpression)) {
    const regExp = new RegExp(trim(matcherExpression, Pattern.REGEXP_DELIMITER));
    return semgent => regExp.exec(semgent);
  } else if (matcherExpression === Pattern.SEGMENT_WILDCARD) {
    return () => true;
  } else {
    return segment => segment === matcherExpression;
  }
}

function isRegExp(matcherExpression) {
  return matcherExpression[0] === Pattern.REGEXP_DELIMITER &&
      matcherExpression[matcherExpression.length - 1] === Pattern.REGEXP_DELIMITER;
}
