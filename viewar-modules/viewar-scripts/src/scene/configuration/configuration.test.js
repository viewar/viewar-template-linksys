import test from 'tape';

import { Configuration } from './configuration';

const createModelInstance = x => x;
const $privileged = x => x;

test('Configuration', assert => {
  const msg = '... can be instantiated';

  const model = {};
  const properties = [];

  const configuration = Configuration({model, properties, createModelInstance, $privileged});

  assert.ok(configuration, msg);

  assert.end();
});
