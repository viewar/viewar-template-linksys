import compose from 'stampit/compose';
import isArray from 'lodash/isArray';

import { Option } from '../../option/option';

export const CategorizedProperty = compose({

  initializers: [function ({values, value, rules}) {
    this.rootOption = createOptions(values, rules) || (() => {throw new Error()})();
    this.value = value || this.value;
  }],

  properties: {
    valueType: 'categorized',
  },

  propertyDescriptors: {
    values: { get() { return this.getValueIterator() } },
  },

  methods: {
    getValueIterator,
    resolveValue,
  }

});

function resolveValue(key) {
  return [...this.values].find(value => value === key || value.key === key || value.name === key);
}

function createOptions(optionsOrRootOption, rules) {
  if (isArray(optionsOrRootOption)) {
    return createOptionsRecursively({
      name: '',
      isValid: () => true,
      children: optionsOrRootOption,
    }, rules, []);
  } else {
    return createOptionsRecursively(optionsOrRootOption, rules, []);
  }
}

function createOptionsRecursively(option, rules, parentPath) {
  const path = [...parentPath, option.name];
  if (option.children) {
    return Object.assign(Option(option), {
      isValid: createValidator(rules, path),
      children: option.children.map(child => createOptionsRecursively(child, rules, path)),
    });
  } else {
    return Option({...option, isValid: createValidator(rules, path)});
  }
}

function createValidator(allRules, path) {
  const rules = allRules.filter(rule => rule.match(path));
  return configuration => rules.every(rule => rule.evaluate(configuration));
}

function* getValueIterator() {
  if (this.children && this.children.length) {
    for (const child of this.children) {
      yield* child.getValueIterator();
    }
  } else {
    yield this;
  }
}
