import test from 'tape';

import { compose, withProps } from './compose';

test('withProps() overrides props that are passed from other outer composables', assert => {

  //===== ASSEMBLE =====

  const outerProps = {
    a: 'outer',
    b: 'outer',
  };

  const injectedProps = {
    b: 'injected',
    c: 'injected',
  };

  function innerFactory(props) {
    Object.assign(this, props);
  }

  function outerFactory(props) {
    Object.assign(this, props);
  }

  //======= ACT ========

  const result = compose(outerFactory, withProps(innerFactory, injectedProps))(outerProps);

  //====== ASSERT ======

  assert.deepEquals(result, {a: 'outer', b: 'injected', c: 'injected'});
  assert.end();
});
