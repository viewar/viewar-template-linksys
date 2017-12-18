import test from 'tape';

import { createModelManager }from './model-manager.js';

test('ModelManager', assert => { 
  const msg = '... can be created';
  
  //===== ASSEMBLE =====

  const coreInterface = {};
  const createModel = () => ({});
  const createCategory = () => ({});

  //======= ACT ========

  const modelManager = createModelManager({coreInterface, createModel, createCategory});
  
  //====== ASSERT ======
  
  assert.ok(modelManager, msg);
  
  assert.end();
});
