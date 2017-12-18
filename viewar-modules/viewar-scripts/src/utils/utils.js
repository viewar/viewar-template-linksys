import deepCopy from 'lodash/cloneDeep';
import toString from 'lodash/toString';
import isString from 'lodash/isString';
import omit from 'lodash/omit';
import isPlainObject from 'lodash/isPlainObject';
import isArray from 'lodash/isArray';
import semver from 'semver';

import versionInfo from './version-info';

import { REFERENCE_POSE_SCALE_FACTOR } from '../constants';

export const generateId = testEnvironment() ? generateIdSingle : generateIdConcat;

function testEnvironment() {
  return Math.random().toString(36).substring(2).length >= 16;
}

function generateIdSingle() {
  return Math.random().toString(36).substring(2, 18);
}

function generateIdConcat() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

export function sanitizePose(pose = {}) {
  return JSON.parse(JSON.stringify({
    position: pose.position && sanitize3DVector(pose.position),
    orientation: pose.orientation && sanitizeQuaternion(pose.orientation),
    scale: pose.scale && sanitize3DVector(pose.scale),
  }));
}

function sanitizeQuaternion(quaternion) {
  if (quaternion instanceof Array) {
    const [w, x, y, z] = quaternion;
    return {w, x, y, z};
  } else {
    const {w, x, y, z} = quaternion;
    return {w, x, y, z};
  }
}

function sanitize3DVector(vector) {
  if (vector instanceof Array) {
    const [x, y, z] = vector;
    return {x, y, z};
  } else {
    const {x, y, z} = vector;
    return {x, y, z};
  }
}

export function toValueObject(valueArray) {
  return valueArray.reduce((object, part) => Object.assign(object, {[part.name]: part.value}), {});
}

export function dictionarize(array, propertyName) {
  return array.reduce((object, part) => Object.assign(object, {[part[propertyName]]: part}), {});
}

export function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

export function sanitizeSimpleModelDescription(description) {
  return {
    id: description.id,
    foreignKey: description.foreignKey || description.foreign_key || '',
    version: description.version,
    name: description.name || '',
    type: description.type,
    tags: [...description.tags || []],
    resources: ([...description.resources || []]).map(({id, version}) => ({id: toString(id), version})),
  };
}

export function sanitizeModelDescription(description) {
  const data = description.data || {};
  return {
    ...sanitizeSimpleModelDescription(description),

    data,

    info: deepCopy(description.modelInfo || description.modelinfo || {}),
    images: (data.galleryImages || []).map(url => ({name: '', url, tags: []})),

    animations: deepCopy(data.animations || {}),
    videos: deepCopy(data.videos || {}),

    materialDescription: [...description.materials || []].map(({id, name, resource_pack: resourcePackId, options, material_system: materialSystem}) => ({id, name, resourcePackId, options, materialSystem})),
    materialList: extractMaterialIds([...description.materials || []]),
    parameterDescription: deepCopy(data.parameters || []),
    configurationDescription: deepCopy(data.configuration || null),

    references: (data.references && data.references.map(({UID, name, pose, version}) => ({id: UID, name, pose: scaleReferencePose(pose), version: Number.parseInt(version)}))) || null,
    minimap: deepCopy(description.minimap || null),

    desc: description.desc,

    defaultInteraction: {
      interactionPlane: description.orientation || 'horizontal',
      translation: description.moveable || description.move,
      rotation: description.rotate === 'y',
      scaling: description.scalable,
    },

  };
}

function extractMaterialIds(materials) {
  const materialIds = [];
  materials.forEach(surface => {
    surface.material_system === '2.0' && surface.materials.forEach(mapping => materialIds.push(...mapping.options))
  });
  return materialIds;
}

export function compileMaterialInfo(coreInterface, materials) {
  return (materials || []).map(material => ({
    id: material.id,
    name: material.name,
    options: material.options.map(option => ({
      id: option.id,
      name: option.name,
      get imageUrl() {
        if (material.materialSystem === '2.0') {
          if (semver.satisfies(versionInfo.core, "^5.3.0")) {
            return coreInterface.resolveUrl(`/ResourceThumbnails/${option.thumb}`);
          } else {
            return coreInterface.resolveUrl(`/Models/Resources/${option.resource}/${option.thumb}`);
          }
        } else {
          return coreInterface.resolveUrl(`/Models/Resources/${material.resourcePackId}/${option.thumb}`);
        }
      }
    }))
  }));
}

function scaleReferencePose(pose) {
  const scaledPose = deepCopy(pose);
  scaledPose.position.x *= REFERENCE_POSE_SCALE_FACTOR;
  scaledPose.position.y *= REFERENCE_POSE_SCALE_FACTOR;
  scaledPose.position.z *= REFERENCE_POSE_SCALE_FACTOR;
  return scaledPose;
}

export function sanitizeModelTree(rawNode) {
  if (rawNode.sub || rawNode.models || rawNode.children) {
    const category = omit(rawNode, ['sub', 'models', 'modelcount']);
    category.children = (rawNode.sub || rawNode.models || rawNode.children).map(sanitizeModelTree);
    category.data = isPlainObject(category.data) ? category.data : {};
    return category;
  } else {
    return sanitizeSimpleModelDescription(rawNode);
  }
}

export function parseScenarioConfig(rawConfig) {
  const {environment = {}, stages = [], uiConfig = {}, config = {}, modes = [], tracking = [], pk_id} = rawConfig;

  if (!stages.length) throw new Error('This app has no available stages!');

  return {
    appId: environment.app,
    host: config.host,
    pkId: pk_id,
    stageList: stages,
    uiConfig,
    storageKey: config.storage,
    modes: modes.map(mode => mode.type),
    deviceOS: environment.deviceOS || 'Browser',
    deviceName: environment.deviceName || 'iPad',
    deviceType: environment.deviceType || 'tablet',
    fakedBundle: environment.fakedBundle || false,
    version: environment.version || 'Unknown',
    trackerList: tracking.map(trackingInfo => Object.assign(trackingInfo, {initiallyActive: trackingInfo.config.autostart})),
    _raw: rawConfig,
  };

}

export const INTERACTION_PROPERTY_NAMES = [
  'primaryDrag',
  'secondaryDrag',
  'rotate',
  'pinch'
];

export const INTERACTION_PROPERTY_VALUES = [
  'disabled',
  'translationScreenSpace',
  'translationScreenSpaceWithoutPivotPointUpdate',
  'translationWorldSpaceHorizontal',
  'translationWorldSpaceHorizontalWithoutPivotPointUpdate',
  'rotationAroundPivot',
  'rotationAroundCameraCenter',
  'translationDolly',
  'angleOfView'
];

export function sanitizeCameraInteraction(newInteraction) {
  let sanitizedInteraction = {};
  Object.keys(newInteraction).forEach(function (propertyName) {
    if (INTERACTION_PROPERTY_NAMES.includes(propertyName)) {
      if (INTERACTION_PROPERTY_VALUES.includes(newInteraction[propertyName])) {
        sanitizedInteraction[propertyName] = newInteraction[propertyName];
      }
    }
  });
  return sanitizedInteraction;
}

export function sanitizeCameraPose(pose) {
  return JSON.parse(JSON.stringify({
    position: pose.position && sanitize3DVector(pose.position),
    orientation: pose.orientation && sanitizeQuaternion(pose.orientation),
    lookAt: pose.lookAt && sanitize3DVector(pose.lookAt),
  }));

  return deepCopy(newPose);
}

export function parse(value) {
  if (isString(value) &&
      (value[0] === '{' || value[0] === '[' || value[0] === '"' ||
      value === 'null' || value === 'true' || value === 'false')) return JSON.parse(value);
  return value;
}

export function emscriptenParse(value) {
  if (isString(value) &&
      (value[0] === '{' || value[0] === '[' || value[0] === '"' ||
      value === 'null' || value === 'true' || value === 'false')) {

    return JSON.parse(convertUInt8ArrayToStr(convertStringToUInt8Array(value)));
  }
  return value;
}

function convertStringToUInt8Array(str) {
  var array = new Uint8Array(new ArrayBuffer(str.length));
  for (var i=0, strLen = str.length; i < strLen; i++) {
    array[i] = str.charCodeAt(i);
  }
  return array;
}

function convertUInt8ArrayToStr(array) {
  var out, i, len, c;
  var char2, char3;
  out = "";
  len = array.length;
  i = 0;
  while(i < len) {
    c = array[i++];
    switch(c >> 4)
    {
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
      // 0xxxxxxx
      out += String.fromCharCode(c);
      break;
      case 12: case 13:
      // 110x xxxx   10xx xxxx
      char2 = array[i++];
      out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
      break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
            ((char2 & 0x3F) << 6) |
            ((char3 & 0x3F) << 0));
        break;
    }
  }
  return out;
}

export function format(value) {
  if (isPlainObject(value) || isArray(value)) return JSON.stringify(value);
  return value;
}

export function createAssignMembers(_, $) {
  return function assignMembers(members) {
    Object.assign(this, members.public);
    Object.assign($(this), members.shared);
    Object.assign(_(this), members.private);
    return this;
  };
}
