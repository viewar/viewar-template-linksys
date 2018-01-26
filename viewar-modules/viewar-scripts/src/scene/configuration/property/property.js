import compose from 'stampit/compose';
import isObject from 'lodash/isObject';

import { KEY_SEPARATOR } from '../../../constants';

export const Property = compose({

  initializers: [function ({name, aliases, keyPattern}) {
    this.name = name || this.name;
    this.keyPattern = keyPattern || [this.name];
    this.aliases = aliases || [this.name];
    this._value = [...this.values][0];
  }],

  staticProperties: {
    KEY_SEPARATOR,
  },

  properties: {
    name: '',
    _value: null,
  },

  methods: {
    hasValidValue,
  },

  propertyDescriptors: {
    value: {
      get() { return this._value; },
      set(newValue) { this._value = this.resolveValue(isObject(newValue) && newValue.key || newValue) || this._value; },
    },
  },

});

function hasValidValue(configuration) {
  return !this.value || this.value.isValid(configuration);
}

