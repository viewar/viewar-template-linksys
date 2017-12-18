import compose from 'stampit/compose';

import { fail } from '../../../utils/utils';

export const NameRule = compose({

  initializers: [function ({nameMatcher}) {
    this.nameMatcher = nameMatcher || fail('Parameter "nameMatcher" must be a function!');
  }],

  methods: {
    matches,
  }

});

function matches(option) {
  return this.nameMatcher(option.name);
}
