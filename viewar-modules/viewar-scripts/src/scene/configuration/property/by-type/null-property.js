import compose from 'stampit/compose';

export const NullProperty = compose({

  methods: {
    getInsertionParams,
  },

  properties: {
    type: 'null',
  },

});

function getInsertionParams(propertyValues, keyPrefixes = []) {
  return {};
}
