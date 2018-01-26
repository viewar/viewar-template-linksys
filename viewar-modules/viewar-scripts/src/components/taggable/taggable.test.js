const test = require('tape');

import { Taggable } from './taggable';

const a = {name: 'a'};
const b = {name: 'b'};
const c = {name: 'c'};

test('Taggable', assert => {
  const msg = '... can be queried for having a particular tag';

  const taggable = Taggable({tags: [a, b]});

//======================================================================================================================

  assert.ok(taggable.hasAnyTag([b, c]), msg);
  assert.notOk(taggable.hasAnyTag([c]), msg);

  assert.end();
});

test('Taggable', assert => {
  const msg = '... can be queried for having all of particular tags';

  const taggable = Taggable({tags: [a, b]});

//======================================================================================================================

  assert.ok(taggable.hasAllTags([a, b]), msg);
  assert.notOk(taggable.hasAllTags([b, c]), msg);

  assert.end();
});

test('Taggable', assert => {
  const msg = '... can be queried for having exact tags';

  const taggable = Taggable({tags: [a, b]});

//======================================================================================================================

  assert.ok(taggable.hasExactTags([a, b]), msg);
  assert.notOk(taggable.hasExactTags([a, b, c]), msg);

  assert.end();
});
