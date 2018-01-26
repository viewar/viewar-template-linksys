import semver from 'semver';
import versionInfo from './version-info';

export default function ifCore(query) {
  for (const [versionQuery, thunk] of Object.entries(query)) {
    if (semver.satisfies(versionInfo.core, versionQuery)) {
      return thunk();
    }
  }
}
