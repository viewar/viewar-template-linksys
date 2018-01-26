import test from 'tape';

import { RangeProperty } from './range-property';

test('RangeProperty', assert => {

  const property = RangeProperty({
    min: 1, max: 100, step: 1,
    rules: [
      {
        pattern: {
          lowerBound: 25,
          upperBound: 50,
          includeLowerBound: false,
          includeUpperBound: true,
          matches: () => true
        }
      },
      {
        pattern: {
          lowerBound: 50,
          upperBound: 75,
          includeLowerBound: true,
          includeUpperBound: true,
          matches: () => true
        }
      },
    ], Option: x => ({key: x.name})
  });

  const keys = [...property.values].map(x => x.key);

  assert.deepEquals(keys, [1, 26, 50, 51, 76]);

  assert.end();
});
