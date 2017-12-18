import test from 'tape';

import { createCoreInterface } from './core-interface.js';

test('CoreInterface', assert => {
  const msg = '... can be created';
  
  //===== ASSEMBLE =====
  //======= ACT ========

  const coreInterface = createCoreInterface({});
  
  //====== ASSERT ======
  
  assert.ok(coreInterface, msg);
  
  assert.end();
});
