const test = require('tape');

import { Pattern } from './pattern';

test('Pattern', assert => {
  const msg = '... matches full paths';

  const pattern = Pattern({expression: 'foo::bar::baz'});

  assert.ok(pattern.matches('foo::bar::baz'), msg);
  assert.notOk(pattern.matches('foo::baz'), msg);

  assert.end();
});

test('Pattern', assert => {
  const msg = '... matches prefixes';

  const path = 'foo::bar::baz';

  const pattern = Pattern({expression: 'foo::bar'});

  assert.ok(pattern.matches(path), msg);

  assert.end();
});

test('Pattern', assert => {
  const msg = '... matches prefixes with wildcards';

  const path = 'foo::bar::baz';

  const pattern = Pattern({expression: '*::bar'});

  assert.ok(pattern.matches(path), msg);

  assert.end();
});

test('Pattern', assert => {
  const msg = '... does not match suffixes';

  const pattern = Pattern({expression: 'foo::bar::baz'});

  assert.notOk(pattern.matches('bar::baz'), msg);

  assert.end();
});

test('Pattern', assert => {
  const msg = '... wildcards match any single segment';

  const path = 'foo::bar::baz';

  const pattern = Pattern({expression: 'foo::*::baz'});

  assert.ok(pattern.matches(path), msg);

  assert.end();
});

test('Pattern', assert => {
  const msg = '... a single wildcard matches all paths';

  const paths = [
    'foo::bar::baz',
    'baz',
    'baz::foo',
    'bar::baz::baz::foo'
  ];

  const pattern = Pattern({expression: '*'});

  assert.ok(paths.every(pattern.matches.bind(pattern)), msg);

  assert.end();
});


test('Pattern', assert => {
  const msg = '... can match a path segment against a regexp';

  const paths = [
    'foo::bar',
    'foo::bar::baz',
    'foo::baz',
    'foo::baz::bar'
  ];

  const pattern = Pattern({expression: 'foo::/ba./'});

  assert.ok(paths.every(pattern.matches.bind(pattern)), msg);

  assert.end();
});
