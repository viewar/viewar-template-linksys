import mixinEmitter from 'component-emitter';

const defaults = {
  name: 'GoogleTango'
};

export default function createGoogleTangoProvider(specification) {

  const {coreInterface, $privileged} = specification;

  let {name} = Object.assign({}, defaults, specification);

  const supportsSlam = false;  // No marker question from home, remove activate/deactivate use marker in toolbar,

  let active = false;
  let tracking = true;
  let groundConfirmed = false;
  let areaDefinitions = [];

  const googleTangoProvider = {
    activate,
    deactivate,
    confirmGroundPosition,
    reset,
    resetAreaDefintion,
    saveAreaDefinition,
    loadAreaDefinition,
    deleteAreaDefinition,
    readAreaDefinitions,

    get areaDefinitions() { return areaDefinitions; },
    get active() { return active; },
    get groundConfirmed() { return groundConfirmed },
    get name() { return name; },
    get tracking() { return tracking; },
    get targets() { return []; },
    get supportsSlam() { return supportsSlam; }
  };

  mixinEmitter(googleTangoProvider);

  return googleTangoProvider;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  function activate() {
    return Promise.resolve().then(function () {
      if (!active) {
        coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        return coreInterface.call('startTracking', name).then(() => {
          groundConfirmed = false;
          tracking = false;
          return active = true;
        });
      } else {
        return false;
      }
    })
  }

  function deactivate() {
    return Promise.resolve().then(function () {
      if (active) {
        coreInterface.off('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        return coreInterface.call('stopTracking', name).then(() => {
          groundConfirmed = false;
          tracking = false;
          return !(active = false);
        });
      } else {
        return false;
      }
    })
  }

  function reset() {
    return Promise.resolve().then(deactivate).then(activate);
  }

  function resetAreaDefintion() {
    return loadAreaDefinition('');
  }

  async function saveAreaDefinition(areaDefinitionName) {
    const fileName = '';  // Ignored argument for google tango.
    await coreInterface.call('saveFeaturetrackingMap', name, fileName, areaDefinitionName);
  }

  function loadAreaDefinition(areaDefinitionName) {
    const fileName = '';  // Ignored argument for google tango.
    return coreInterface.call('loadFeaturetrackingMap', name, fileName, areaDefinitionName);
  }

  function deleteAreaDefinition(areaDefinitionName) {
    const fileName = '';  // Ignored argument for google tango.
    return coreInterface.call('deleteFeaturetrackingMap', name, fileName, areaDefinitionName);
  }

  async function readAreaDefinitions() {
    const areaDefinitionsJSON = await coreInterface.call('customTrackingCommand', name, 'getADFsInfo', '');
    if (areaDefinitionsJSON) {
      areaDefinitions = JSON.parse(areaDefinitionsJSON);
    } else {
      areaDefinitions = [];
    }

    return areaDefinitions;
  }

  function confirmGroundPosition() {
    groundConfirmed = true;
    return coreInterface.call('confirmGroundPosition', name);
  }

//======================================================================================================================
// PRIVATE FUNCTIONS
//======================================================================================================================

  function handleTrackingTargetStatusChanged(targetName, event) {
    tracking = event === 'found';
    googleTangoProvider.emit('trackingTargetStatusChanged', tracking);
  }

}
