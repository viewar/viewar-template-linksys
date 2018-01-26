


export function mixinStateUpdate(camera, updateCall, pose) {
  let intervalId = null;

  /**
   * Starts the automatic camera pose update, which is by default turned off for performance reasons. The pose returned
   * is relative to the initialized virtual space origin.
   * @param {number} intervalInMs update interval
   * @memberof Camera#
   */
  function startPoseUpdate(intervalInMs) {
    intervalId = setInterval(updatePose, intervalInMs);
  }

  /**
   * Stops the automatic pose update.
   * @memberof Camera#
   */
  function stopPoseUpdate() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  /**
   * Updates the camera pose once.
   * @returns {Promise.<ControllableCameraPose>} current camera pose
   * @memberof Camera#
   */
  function updatePose() {
    return updateCall().then(newPose => Object.assign(pose, newPose));
  }

  Object.assign(camera, {
    startPoseUpdate,
    updatePose,
    stopPoseUpdate,
  });
}

export function mixinHmdMode(camera, name, coreInterface) {


  /**
   * Switches to stereoscopic rendering mode for use in HMDs.
   * @returns {Promise} resolved on completion.
   * @memberof Camera#
   */
  function enableHmdMode() {
    return coreInterface.call('setRigType', name, 'StereoParallel');
  }

  /**
   * Switches to regular rendering mode for handheld devices.
   * @returns {Promise} resolved on completion.
   * @memberof Camera#
   */
  function disableHmdMode() {
    return coreInterface.call('setRigType', name, 'Single');
  }

  Object.assign(camera, {
    enableHmdMode,
    disableHmdMode,
  });
}

export function mixinPoseInDirection(camera, coreInterface) {

  /**
   * Calculates a point in 3d space in front of the camera at specified distance.
   * @param {number} distance distance from camera
   * @param {boolean?} projectToFloor if true, projects the resulting point onto the xz plain
   * @returns {Promise.<Vector3d>} resulting position
   * @memberOf Camera#
   */
  function getPoseInViewingDirection(distance, projectToFloor = false) {
    return coreInterface.call('getPoseInViewingDirection', distance, !!projectToFloor);
  }

  Object.assign(camera, {
    getPoseInViewingDirection,
  });
}
