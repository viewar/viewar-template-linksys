const test = require('tape');

import { Locatable } from './locatable';

function createMockCoreInterface() {
  const history = [];
  const coreInterface = {
    history,
    call(...args) {
      history.push(args);
      return Promise.resolve();
    }
  };

  return coreInterface;
}

test('Locatable', assert => {
  const msg = '... has default pose if none specified';

  const locatable = Locatable({id: 'someId', coreInterface: {}});

  assert.deepEquals(locatable.pose, Locatable.DEFAULT_POSE, msg);

  assert.end();
});

test('Locatable', assert => {
  const msg = '... setPose() updates object\'s pose in the core.';

  const coreInterface = createMockCoreInterface();

  const locatable = Locatable({id: 'someId', coreInterface});

  const newPose = {
    position: {
      x: 1000,
      y: 1000,
      z: 1000
    }
  };

  locatable.setPose(newPose).then(() => {

    const expected = [
      'setInstancePose', locatable.id, JSON.stringify(locatable.pose)
    ];

    const actual = coreInterface.history[0];

    assert.deepEquals(actual, expected, msg);
  });

  assert.plan(1);
});
