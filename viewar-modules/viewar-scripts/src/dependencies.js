import createInjector from 'dependency-injector';

//======================================================================================================================
// SINGLETON
//======================================================================================================================

export const injector = Object.assign(createInjector(), {
  wireFactory,
});

export $ from './utils/shared';

//======================================================================================================================
// CUSTOM WIRING
//======================================================================================================================

export function wireFactory(factory, dependencies = false) {
  return function (props = {}) {
    return factory({...props, ...injector.resolveDictionary(dependencies || factory.dependencies)});
  }
}

//======================================================================================================================
// SYMBOLS
//======================================================================================================================

export const CoreInterface = Symbol('CoreInterface');
export const AuthenticationManager = Symbol('AuthenticationManager');
export const AppUtils = Symbol('AppUtils');
export const ModelManager = Symbol('ModelManager');
export const SceneManager = Symbol('SceneManager');
export const RoomManager = Symbol('RoomManager');
export const LocalStorage = Symbol('LocalStorage');
export const CloudStorage = Symbol('CloudStorage');
export const ProjectManager = Symbol('ProjectManager');
export const SyncManager = Symbol('SyncManager');
export const Logger = Symbol('Logger');
export const Http = Symbol('Http');

//======================================================================================================================
// UNSORTED DEPENDENCIES
//======================================================================================================================

export const Window = Symbol('Window');

export const Date = Symbol('Date');

export const Config = Symbol('Config');
export const AppConfig = Symbol('AppConfig');
