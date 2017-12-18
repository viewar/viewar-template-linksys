import test from 'tape';

import { createParser } from './parser';

test('createParser: parse() generates an evaluator function from a rule string', assert => {
  const parser = createParser();

  const ruleEvaluator = parser.parse("true or false");

  assert.ok(typeof ruleEvaluator.evaluator === 'function');
  assert.end();
});

test('createParser: parse() throws an error on malformed rules', assert => {
  const parser = createParser();
  assert.throws(() => parser.parse("true and and false"));
  assert.throws(() => parser.parse("true or Prop"));
  assert.throws(() => parser.parse("Prop like ([a::b] or [a::c]"));
  assert.throws(() => parser.parse("Prop like [a] ]"));
  assert.throws(() => parser.parse("Prop like [a] f"));
  assert.end();
});

test('createParser: evaluator supports not operator', assert => {
  const parser = createParser();
  const ruleEvaluator = parser.parse("not true");
  assert.notOk(ruleEvaluator.evaluator({}));
  assert.end();
});

test('createParser: evaluator supports and operator', assert => {
  const parser = createParser();
  const ruleEvaluator = parser.parse("true and false");
  assert.notOk(ruleEvaluator.evaluator({}));
  assert.end();
});

test('createParser: evaluator supports or operator', assert => {
  const parser = createParser();
  const ruleEvaluator = parser.parse("false or false or true");
  assert.ok(ruleEvaluator.evaluator({}));
  assert.end();
});

test('createParser: evaluator supports complicated expressions', assert => {
  const parser = createParser();
  const ruleEvaluator = parser.parse("(true or ((false))) and (not false and not (not true))");
  assert.ok(ruleEvaluator.evaluator({}));
  assert.end();
});

test('createParser: evaluator supports comparisons with "like" and "not like" operators', assert => {
  const configuration = {properties: {
    'Property1': {value: {key: 'key::to::option::1'}},
    'Property2': {value: {key: 'key::to::option::3'}}
  }};
  configuration.propertiesByName = configuration.properties;

  const parser = createParser();

  assert.ok(parser.parse("Property1 like [key::to::option::1]").evaluator(configuration));
  assert.ok(parser.parse("Property2 not like [key::to::option::2]").evaluator(configuration));

  assert.end();
});

test('createParser: evaluator supports xor operator', assert => {
  const parser = createParser();

  assert.ok(parser.parse("true xor true xor true").evaluator());
  assert.notOk(parser.parse("true xor true").evaluator());
  assert.ok(parser.parse("true").evaluator());

  assert.end();
});

test('createParser: evaluator supports "is" and "is not" operators', assert => {
  const configuration = {properties: {
    'Property1': {value: {key: 'path1'}},
    'Property2': {value: {key: 'path3'}}
  }};
  configuration.propertiesByName = configuration.properties;

  const parser = createParser();

  assert.ok(parser.parse("Property1 is [path1]  and  Property2 is not [path2]").evaluator(configuration));

  assert.end();
});

test('createParser: parser gathers properties', assert => {
  const parser = createParser();

  const expected = ['Property1', 'Property2', 'Property3'];

  const actual = parser.parse("Property1 is [path1]  and  Property2 is not [path2]  or not  (Property3 is [path3])").comparisons.map(comparison => comparison.propertyName);

  assert.deepEquals(actual, expected);

  assert.end();
});

test('createParser: parser gathers patterns', assert => {
  const parser = createParser();
  const expected = ['path1', 'path2', 'path3'];

  const actual = parser.parse("Property1 is [path1]  and  Property2 is not [path2]  or not  (Property3 is [path3])").comparisons.map(comparison => comparison.pattern.expression);

  assert.deepEquals(actual, expected);

  assert.end();
});

test('createParser: evaluator supports comparisons with "is null" and "is not null" operators', assert => {
  const configuration = {properties: {
    'Property1': {value: {key: 'key::to::option::1', null: true}},
    'Property2': {value: {key: 'key::to::option::3'}}
  }};
  configuration.propertiesByName = configuration.properties;

  const parser = createParser();

  assert.ok(parser.parse("Property1 is null").evaluator(configuration));
  assert.ok(parser.parse("Property2 is not null").evaluator(configuration));

  assert.end();
});


test('createParser: evaluator supports numerical comparisons operators', assert => {
  const configuration = {properties: {
    'Property1': {value: {key: '150'}},
    'Property2': {value: {key: '50'}}
  }};
  configuration.propertiesByName = configuration.properties;

  const parser = createParser();

  assert.ok(parser.parse("Property1 > 100").evaluator(configuration));
  assert.ok(parser.parse("Property1 >= 150").evaluator(configuration));
  assert.ok(parser.parse("Property2 < 100").evaluator(configuration));
  assert.ok(parser.parse("Property2 <= 50").evaluator(configuration));
  assert.ok(parser.parse("Property2 in [50, 50]").evaluator(configuration));
  assert.ok(parser.parse("Property2 in [50, 100]").evaluator(configuration));
  assert.ok(parser.parse("Property2 not in <50, 100]").evaluator(configuration));
  assert.ok(parser.parse("Property1 in [100, 150]").evaluator(configuration));
  assert.ok(parser.parse("Property1 not in [100, 150>").evaluator(configuration));

  assert.end();
});
