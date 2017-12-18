import mixinEmitter from 'component-emitter';

export default function createMockProvider() {

  return mixinEmitter({
    activate: () => Promise.resolve(),
    deactivate: () => Promise.resolve(),
    reset: () => Promise.resolve(),
    confirmGroundPosition: () => Promise.resolve(),
    setFloorOffset: () => Promise.resolve(),
    startMeshScan: () => Promise.resolve(),
    stopMeshScan: () => Promise.resolve(),
    resetMeshScan: () => Promise.resolve(),
    setScanVolume: () => Promise.resolve(),
    getMeshList: () => Promise.resolve([]),
    getFloorOffset: () => Promise.resolve(),
    getStatus: () => Promise.resolve({}),
    getTrackingQuality: () => Promise.resolve(0),

    active: false,
    groundConfirmed: false,
    name: 'Mock',
    tracking: false,
    targets: [],
    floorOffset: 0,
    supportsSlam: false,
    meshScanning: false,
    quality: 0,
    scanVolume: {},
    sensorStatus: {}
  });

}
