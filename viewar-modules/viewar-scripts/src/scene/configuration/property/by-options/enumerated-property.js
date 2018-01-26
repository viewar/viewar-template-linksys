import compose from 'stampit/compose';

import { Option } from '../../option/option';

export const EnumeratedProperty = compose({

  initializers: [function ({values, value, rules}) {
    this.options = createOptions(values, rules) || (() => {throw new Error()})();
    this.value = value || this.value;
  }],

  properties: {
    valueType: 'enumerated',
  },

  propertyDescriptors: {
    values: { get() { return this.getValueIterator() } },
  },

  methods: {
    getValueIterator,
    resolveValue,
  },

});

function* getValueIterator() {
  yield* this.options[Symbol.iterator]();
}

function resolveValue(key) {
  return key && this.options.find(value => value === key || value.key === key || value.key === key.key || value.name === key);
}

function createOptions(options, rules) {
  return options.map(option => Option({...option, isValid: createValidator(rules, option.name)}));
}

function createValidator(allRules, path) {
  const rules = allRules.filter(rule => rule.match(path));
  return configuration => rules.every(rule => rule.evaluate(configuration));
}
