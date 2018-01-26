// HELPER //
export async function sortTouchesByDistance(touches, api) {
  const { cameras: { perspectiveCamera, augmentedRealityCamera } } = api;

  const activeCamera = perspectiveCamera.active ? perspectiveCamera : augmentedRealityCamera;

  const cameraPose = await activeCamera.updatePose();

  // Sort intersections by nearest distance to camera.
  touches.map(touch => {
    for (const intersection of touch.intersection) {
      const x = cameraPose.position.x - intersection.x;
      const y = cameraPose.position.y - intersection.y;
      const z = cameraPose.position.z - intersection.z;
      intersection.squaredDistance = x * x + y * y + z * z;
    }

    touch.intersection.sort((a, b) => a.squaredDistance + b.squaredDistance);
  });

  // Sort touches by nearest distance from nearest intersection to camera.
  touches.sort((a, b) => a.intersection[0].squaredDistance - b.intersection[0].squaredDistance);

  return touches;
}