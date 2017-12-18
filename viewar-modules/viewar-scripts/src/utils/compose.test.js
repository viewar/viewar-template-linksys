import test from 'tape';

import { compose } from './compose';
import sharedMembers from './shared';

test('compose() combines factory functions', assert => {

  //===== ASSEMBLE =====

  const Factory = function () {
    this.value = 'foo';
  };

  const OtherFactory = function () {
    this.otherValue = 'bar';
  };

  //======= ACT ========

  const ComposedFactory = compose(Factory, OtherFactory);

  //====== ASSERT ======

  const expected = {
    value: 'foo',
    otherValue: 'bar',
  };

  assert.deepEquals(ComposedFactory(), expected);

  assert.end();
});

test('composed factories accept props', assert => {

  //===== ASSEMBLE =====

  const Factory = function ({value}) {
    this.value = value;
  };

  const OtherFactory = function ({otherValue}) {
    this.otherValue = otherValue;
  };

  //======= ACT ========

  const ComposedFactory = compose(Factory, OtherFactory);

  //====== ASSERT ======

  const expected = {
    value: 'foo',
    otherValue: 'bar',
  };

  assert.deepEquals(ComposedFactory(expected), expected);

  assert.end();
});

test('composed factories receive a shared namespace', assert => {

  //===== ASSEMBLE =====

  const Factory = compose(function ({value}, sharedMembers) {
    sharedMembers(this).value = value;
  });

  //======= ACT ========

  const expected = {};
  const object = Factory({value: expected});

  //====== ASSERT ======

  assert.equals(sharedMembers(object).value, expected);

  assert.end();
});

test('composed factory props object defaults to empty object', assert => {
  const Factory = compose(function (props) {
    const x = props.x;
  });

  try {
    const object = Factory();
    assert.pass();
  } catch (error) {
    assert.fail();
  }

  assert.end();
});

test('composed factory can be recomposed', assert => {
  const prop = {};

  const Factory = compose(compose(function ({prop}) {
    this.prop = prop;
  }));

  const object = Factory({prop});
  assert.equals(object.prop, prop);
  assert.end();
});
