import compose from 'stampit/compose';

export const Constant = compose({

  initializers: [function ({params}) {
    this.params = params;
  }],

  methods: {
    getInsertionParams,
  }

});

function getInsertionParams() {
  return this.params;
}
