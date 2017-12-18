import { createIosAdapter } from './ios-adapter.js';
import { createWindowsAdapter } from './windows-adapter.js';
import { createAndroidAdapter } from './android-adapter.js';
import { createEmscriptenAdapter } from './emscripten-adapter.js';
import { createMockAdapter } from './mock-adapter.js';

export async function resolveAdapter(window, emitter) {
  const adapters = [
    createIosAdapter(window, emitter),
    createAndroidAdapter(window, emitter),
    createWindowsAdapter(window, emitter),
    createEmscriptenAdapter(window, emitter),
    createMockAdapter(window, emitter),
  ];

  for (const adapter of adapters) {
    if (await adapter.query()) return adapter;
  }

  throw new Error('There is no interface adapter for this platform!');
}
