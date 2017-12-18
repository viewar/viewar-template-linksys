const test = require('tape');

import { Identifiable } from './identifiable';

test('Identifiable', assert => {
  const msg = '... generates no more than one id regardless of the composition';

  let callCount = 0;

  Identifiable.generateId = () => {
    ++callCount;
    return 'someId';
  };

  const Factory = Identifiable.compose(Identifiable);

  Factory();

  const expected = 1;
  const actual = callCount;

  assert.equals(actual, expected, msg);

  assert.end();
});

test('Identifiable', assert => {
  const msg = '... can be initialized with an id';

  const id = {};

  const object = Identifiable({id});

  const expected = id;
  const actual = object.id;

  assert.equals(actual, expected, msg);

  assert.end();
});
