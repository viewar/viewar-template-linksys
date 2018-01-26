import compose from 'stampit/compose';

export const MaterialProperty = compose({

  methods: {
    getInsertionParams,
  },

  properties: {
    type: 'material',
  },

});

function getInsertionParams(propertyValues, keyPrefixes = []) {
  if (this.value.null) {
    return {};
  } else {
    const materials = this.aliases.map(materialName => ({
      [materialName]: this.value.key,
    }));

    return {
      propertyValues: Object.assign({}, ...materials),
    };
  }
}
