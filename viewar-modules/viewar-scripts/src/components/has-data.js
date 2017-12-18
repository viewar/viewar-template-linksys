import compose from 'stampit/compose';

export const HasData = compose({

  initializers: [function ({data}) {
    this.data = data || {};
  }],

});
