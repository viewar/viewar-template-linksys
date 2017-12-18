const test = require('tape');

import { Highlightable } from './highlightable';

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

test('Highlightable', assert => {
  const msg = '... has default highlight if none specified';

  const highlightable = Highlightable({id: 'someId', coreInterface: {}});

  assert.deepEquals(highlightable.highlight, Highlightable.DEFAULT_HIGHLIGHT, msg);

  assert.end();
});

test('Highlightable', assert => {
  const msg = '... setHighlightable() updates object\'s highlight visibility in the core.';

  const coreInterface = createMockCoreInterface();

  const highlightable = Highlightable({id: 'someId', coreInterface});

  const newVisibility = false;

  highlightable.setHighlighted(newVisibility).then(() => {

    const expected = [
      'setNodeHighlight', highlightable.id, highlightable.highlighted
    ];

    const actual = coreInterface.history[0];

    assert.deepEquals(actual, expected, msg);
  });

  assert.plan(1);
});
