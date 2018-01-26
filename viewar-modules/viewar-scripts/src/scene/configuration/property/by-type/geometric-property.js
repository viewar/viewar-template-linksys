import compose from 'stampit/compose';

export const GeometricProperty = compose({

  methods: {
    getInsertionParams
  },

  properties: {
    type: 'geometric',
  },

});

function getInsertionParams(propertyValues, keyPrefixes = []) {
  if (this.value.null) {
    return {};
  } else {
    const parameters = this.aliases.map(parameterName => ({
      [parameterName]: this.value.key,
    }));

    return {
      propertyValues: Object.assign({}, ...parameters),
    };
  }
}
