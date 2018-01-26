import { AuthenticationManager, injector } from '../dependencies';

injector.register(AuthenticationManager, () => createAuthenticationManager() );

export { AuthenticationManager } from '../dependencies';
export function createAuthenticationManager() {
  let token = '';

  return {
    get token() { return token },
    logIn: (name, password) => token = name,
    logOut: () => token = '',
  };
}
