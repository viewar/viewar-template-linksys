import compose from 'stampit/compose';

export const Range = compose({

  initializers: [
    initializer
  ],

  staticProperties: {
    EXPRESSION_REGEXP: /([<\[])(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)([>\]])/,
    fromRangeExpression
  },

  methods: {
    matches,
  }

});

function initializer({lowerBound = -Infinity, upperBound = Infinity, includeLowerBound, includeUpperBound}) {
  this.lowerBound = lowerBound;
  this.upperBound = upperBound;
  this.includeLowerBound = includeLowerBound;
  this.includeUpperBound = includeUpperBound;

  this.compareLowerBound = includeLowerBound ?
      value => value >= lowerBound :
      value => value > lowerBound;

  this.compareUpperBound = includeUpperBound ?
      value => value <= upperBound :
      value => value < upperBound;
}

function fromRangeExpression(expression) {
  const matches = Range.EXPRESSION_REGEXP.exec(expression.trim());

  const [, lowerBoundSymbol, lowerBound, upperBound, upperBoundSymbol] = matches;

  return Range({
    lowerBound,
    upperBound,
    includeLowerBound: lowerBoundSymbol === '[',
    includeUpperBound: upperBoundSymbol === ']'
  });
}

function matches(value) {
  const castValue = typeof value === 'number' ? value : Number.parseFloat(value);

  return this.compareLowerBound(castValue) && this.compareUpperBound(castValue);
}


function createRange(lowerBound, upperBound, includeLowerBound, includeUpperBound) {

  const compareLowerBound = includeLowerBound ?
      value => value >= lowerBound :
      value => value > lowerBound;

  const compareUpperBound = includeUpperBound ?
      value => value <= upperBound :
      value => value < upperBound;

  return {
    lowerBound,
    upperBound,
    includeLowerBound,
    includeUpperBound,
    matches,
  };

  function matches(value) {
    const castValue = typeof value === 'number' ? value : Number.parseFloat(value);

    return compareLowerBound(castValue) && compareUpperBound(castValue);
  }
}
