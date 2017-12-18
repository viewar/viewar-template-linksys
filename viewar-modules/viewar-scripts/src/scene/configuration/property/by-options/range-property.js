import compose from 'stampit/compose';
import isInteger from 'lodash/isInteger';
import isString from 'lodash/isString';
import isObject from 'lodash/isObject';
import compact from 'lodash/compact';

import { Option } from '../../option/option';

export const RangeProperty = compose({

  initializers: [function ({values: {min = 0, max = Number.MAX_SAFE_INTEGER, step = 1}, rules, value = 0}) {
    this.min = min;
    this.max = max;
    this.step = step;
    this.value = value;

    this._rules = rules || this._rules;
  }],

  properties: {
    valueType: 'range',
  },

  propertyDescriptors: {
    values: { get() { return this::getValueIterator() } },
    ranges: { get() { return this::getRanges() } },
  },

  deepProperties: {
    _optionCache: [],
    _rules: [],
    _ranges: null,
  },

  methods: {
    getRanges,
    getValueIterator,
    resolveValue,
    hasValue,
  }

});

function getRanges() {
  if (this._ranges) return this._ranges;

  const { min, max, step, _rules: rules } = this;

  const startValues = [];

  startValues[(min - min) / step] = {
    value: min,
    start: true,
  };

  startValues[(max - min) / step] = {
    value: max,
    end: true,
  };

  rules.forEach(({info: {lowerBound, upperBound, includeLowerBound, includeUpperBound}}) => {
    const rangeMin = ((lowerBound - min) / step) + (includeLowerBound ? 0 : 1);
    const rangeMax = ((upperBound - min) / step) - (includeUpperBound ? 0 : 1);

    Object.assign((startValues[rangeMin] = startValues[rangeMin] || {}), {
      value: Number.parseFloat(lowerBound) + (includeLowerBound ? 0 : step),
      start: true,
    });
    if (lowerBound > min) {
      Object.assign((startValues[rangeMin - 1] = startValues[rangeMin - 1] || {}), {
        value: Number.parseFloat(lowerBound) - step + (includeLowerBound ? 0 : step),
        end: true,
      });
    }
    Object.assign((startValues[rangeMax] = startValues[rangeMax] || {}), {
      value: Number.parseFloat(upperBound) - (includeUpperBound ? 0 : step),
      end: true,
    });
    if (upperBound < max) {
      Object.assign((startValues[rangeMax + 1] = startValues[rangeMax + 1] || {}), {
        value: Number.parseFloat(upperBound) + step - (includeUpperBound ? 0 : step),
        start: true,
      });
    }
  });

  const ranges = [];

  const compactValues = compact(startValues);

  while (compactValues.length) {
    const start = compactValues.shift();
    const isValid = createValidator(rules, start.value);
    if (start.start && start.end) {
      ranges.push({
        min: start.value,
        max: start.value,
        isValid,
      });
    } else {
      const end = compactValues.shift();
      ranges.push({
        min: start.value,
        max: end.value,
        isValid,
      });
    }
  }

  this._ranges = ranges;

  return ranges;
}

function* getValueIterator() {
  for (const range of this.getRanges()) {
    if (this.value && (this.value.key >= range.min && this.value.key <= range.max)) {
      yield this.value;
    } else {
      yield this.resolveValue(range.min);
    }
  }
}

function resolveValue(keyOrValue) {
  if (isObject(keyOrValue) && this._optionCache[keyOrValue.key]) {
    return this._optionCache[keyOrValue.key];
  } else {
    const numericKey = isString(keyOrValue) ? Number.parseFloat(keyOrValue) : keyOrValue;
    if (isInteger((numericKey - this.min) / this.step)) {
      this._optionCache[numericKey] = this._optionCache[numericKey] ||
          Option({name: numericKey, key: numericKey, isValid: createValidator(this._rules, numericKey)});

      return this._optionCache[numericKey];
    }
  }

  return null;
}

function hasValue(value) {
  return !!this._optionCache[value.key];
}

function createValidator(allRules, path) {
  const rules = allRules.filter(rule => rule.match(path));
  return configuration => rules.every(rule => rule.evaluate(configuration));
}
