import compose from 'stampit/compose';
import cloneDeep from 'lodash/cloneDeep';

import { $ } from '../../dependencies';
import { Identifiable } from '../identifiable/identifiable';
import { sanitizePose } from '../../utils/utils.js';
import { DEFAULT_POSE } from '../../constants';

/**
 * Adds pose getter and setter to the object.
 *
 * @interface Locatable
 * @extends Identifiable
 *
 */
export const Locatable = compose(Identifiable, {

  initializers: [function ({pose = Locatable.DEFAULT_POSE, coreInterface}) {
    const _pose = cloneDeep(pose);

    /**
     * Object's pose.
     * @member {Pose} pose
     * @memberof Locatable#
     */
    Object.defineProperty(this, 'pose', {
      get: () => cloneDeep(_pose),
      enumerable: true,
      configurable: false
    });

    /**
     * Changes object's pose.
     * @method setPose
     * @memberof Locatable#
     * @param newPose {Pose}
     * @returns {Promise} Promise that resolves when updated.
     */
    this.setPose = function setPose(newPose) {
      return Promise.resolve()
          .then(() => Object.assign(_pose, sanitizePose(newPose)))
          .then(() => coreInterface.call('setInstancePose', this.id, JSON.stringify(_pose)));
    };

    Object.assign($(this), {
      updatePose(newPose) {
        return Object.assign(_pose, sanitizePose(newPose));
      }
    });

  }],

  staticPropertyDescriptors: {
    DEFAULT_POSE: {
      get: () => cloneDeep(DEFAULT_POSE),
      enumerable: true,
      configurable: false
    }
  }

});

