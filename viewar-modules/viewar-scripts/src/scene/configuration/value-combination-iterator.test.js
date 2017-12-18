const test = require('tape');

import createValueCombinationIterator from './value-combination-iterator';

test('ValueCombinationIterator', assert => {
  const msg = '... iterates over all possible configuration combinations';

  const properties = [
    {
      name: '1',
      values: ['1a', '1b']
    },
    {
      name: '2',
      values: ['2a', '2b']
    }
  ];

  const expected = [
      [{name: '1', value: '1a'}, {name: '2', value: '2a'}],
      [{name: '1', value: '1a'}, {name: '2', value: '2b'}],
      [{name: '1', value: '1b'}, {name: '2', value: '2a'}],
      [{name: '1', value: '1b'}, {name: '2', value: '2b'}],
  ];

  const actual = [...createValueCombinationIterator(properties)];

  assert.deepEquals(actual, expected, msg);
  assert.end();
});

test('ConfigurableModel', assert => {
  const msg = '... iterates over all possible configuration with values fixed for given properties';

  const properties = [
    {
      name: '1',
      values: ['1a', '1b']
    },
    {
      name: '2',
      values: ['2a', '2b']
    },
    {
      name: '3',
      values: ['3a', '3b', '3c', '3d']
    }
  ];

  const expected = [
    [{name: '1', value: '1a'}, {name: '2', value: '2a'}, {name: '3', value: '3b'}],
    [{name: '1', value: '1a'}, {name: '2', value: '2b'}, {name: '3', value: '3b'}],
    [{name: '1', value: '1b'}, {name: '2', value: '2a'}, {name: '3', value: '3b'}],
    [{name: '1', value: '1b'}, {name: '2', value: '2b'}, {name: '3', value: '3b'}],
  ];

  const fixedValues = {'3': '3b'};

  const actual = [...createValueCombinationIterator(properties, fixedValues)];

  assert.deepEquals(actual, expected, msg);
  assert.end();
});
