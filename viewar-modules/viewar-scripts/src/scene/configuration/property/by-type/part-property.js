import compose from 'stampit/compose';
import { KEY_SEPARATOR } from '../../../../constants';

export const PartProperty = compose({

  methods: {
    getInsertionParams
  },

  properties: {
    type: 'part',
  },

});


function getInsertionParams() {
  if (this.value.foreignKey) {
    return {
      parts: [this.value.foreignKey],
    };
  } else if (this.value.foreignKeys) {
    return {
      parts: this.value.foreignKeys,
    };
  } else if (this.value.null) {
    return {
      parts: [],
    }
  } else {
    console.warn(`Warning! Part property ${this.name} missing foreign key for value ${this.value.name}!`);
    return {
      parts: [],
    };
  }
}
