import test from 'tape';

import { assign } from './compose';

test('assign() functions like Object.assign() for properties with value descriptors', assert => {

  //===== ASSEMBLE =====

  const original = {
    primitive: 100,
    object: {},
    fn() {},
  };

  //======= ACT ========

  const actual = assign({}, original);

  //====== ASSERT ======

  const expected = Object.assign({}, original);

  assert.deepEquals(actual, expected);

  assert.end();
});

test('assign() copies getters properly', assert => {

  //===== ASSEMBLE =====

  let internalValue = 'foo';
  const original = {
    get value() { return internalValue },
  };

  const copy = assign({}, original);

  //======= ACT ========

  internalValue = 'bar';

  //====== ASSERT ======

  assert.equals(copy.value, internalValue);

  assert.end();
});

