import compose from 'stampit/compose';

import { PATH_SEPARATOR } from '../../../constants';

import zip from 'lodash/zip';
import trim from 'lodash/trim';

const SEGMENT_WILDCARD = '*';
const REGEXP_DELIMITER = '/';

export const Pattern = compose({

  initializers: [function ({expression}) {
    this.expression = expression || this.expression;
  }],

  staticProperties: {
    PATH_SEPARATOR,
    SEGMENT_WILDCARD,
    REGEXP_DELIMITER,
  },

  properties: {
    expression: SEGMENT_WILDCARD,
  },

  methods: {
    matches,
  }

});

function matches(path) {
  return (path === this.expression) || isPrefix(path, this.expression);
}

function isPrefix(path, expression) {
  return zip(path.toString().split(Pattern.PATH_SEPARATOR), expression.split(Pattern.PATH_SEPARATOR))
      .every(segmentMatchesPattern);
}

function segmentMatchesPattern([pathSegment, expressionSegment]) {
  if (!pathSegment) return false;
  if (pathSegment === expressionSegment) return true;
  if (!expressionSegment || expressionSegment === Pattern.SEGMENT_WILDCARD) return true;
  if (isRegExp(expressionSegment)) return parseRegExpSegment(expressionSegment).exec(pathSegment);

  return false;
}

function isRegExp(patternSegment) {
  return patternSegment[0] === Pattern.REGEXP_DELIMITER &&
      patternSegment[patternSegment.length - 1] === Pattern.REGEXP_DELIMITER;
}

function parseRegExpSegment(expressionSegment) {
  return new RegExp(trim(expressionSegment, Pattern.REGEXP_DELIMITER));
}
