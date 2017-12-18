import compose from 'stampit/compose';

import { Taggable } from '../../../components/taggable/taggable';

export const Option = compose(Taggable, {

  initializers: [function ({name, null: isNull, key, foreignKey, isValid, imageUrl}) {
    this.name = name || this.name;
    this.null = isNull || this.null;
    this.key = key || this.name;
    this.foreignKey = foreignKey || null;
    this.isValid = isValid || this.isValid;
    this.imageUrl = imageUrl || this.imageUrl;
  }],

  properties: {
    name: '',
    key: '',
    imageUrl: '',
    null: false,
    isValid: () => true,
  },

});
