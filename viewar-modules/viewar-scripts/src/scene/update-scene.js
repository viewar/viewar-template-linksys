export function updateScene(oldScene, newScene, { addNode, removeNode, updateNode, moveNode }, emit = () => {}) {

  const { nodesToAdd, nodesToUpdate, nodesToRemove, nodesToMove } = analyzeNodes(null, oldScene, newScene);

  const totalCount = nodesToAdd.length + nodesToUpdate.length + nodesToRemove.length;

  let currentItem = 0;
  emit('sceneStateUpdateStarted', totalCount);

  function updateCount() {
    emit('sceneStateUpdateProgress', ++currentItem, totalCount);
  }

  return Promise.all([
    Promise.all(nodesToUpdate.map(info => updateNode(info).then(updateCount))),
    Promise.all(nodesToRemove.map(node => removeNode(node).then(updateCount))),
    Promise.all(nodesToMove.map(node => moveNode(node).then(updateCount))),
    Promise.all(nodesToAdd.map(node => addNode(node.parent, node.specification).then(updateCount))),
  ]).then(() => emit('sceneStateUpdateCompleted'));

}

export function analyzeNodes(parent, oldScene, newScene) {
  const nodesToUpdate = {};
  const nodesToAdd = {};
  const nodesToRemove = {};
  const nodesToMove = {};

  compareNodes(parent, oldScene, newScene);

  function compareNodes(parent, oldSceneNode, newSceneNode) {
    if (oldSceneNode && newSceneNode) {
      nodesToUpdate[oldSceneNode.id] = ({oldSceneNode, newSceneNode});
      if (oldSceneNode.children && newSceneNode.children) {
        const children = {};

        oldSceneNode.children.forEach(oldChild => children[oldChild.id] = Object.assign({}, children[oldChild.id], {oldChild}));
        newSceneNode.children.forEach(newChild => children[newChild.id] = Object.assign({}, children[newChild.id], {newChild}));

        Object.values(children).forEach(({oldChild, newChild}) => compareNodes(oldSceneNode, oldChild, newChild));
      }
    } else if (!oldSceneNode && newSceneNode) {
      if (nodesToRemove[newSceneNode.id]) {
        nodesToMove[newSceneNode.id] = {node: nodesToRemove[newSceneNode.id], parent};
        delete nodesToRemove[newSceneNode.id];
      } else {
        nodesToAdd[newSceneNode.id] = {parent, specification: newSceneNode};
      }
    } else if (!newSceneNode && oldSceneNode) {
      if (nodesToAdd[oldSceneNode.id]) {
        nodesToMove[oldSceneNode.id] = {node: nodesToAdd[oldSceneNode.id], parent: nodesToAdd[oldSceneNode.id].parent};
        delete nodesToAdd[oldSceneNode.id];
      } else {
        nodesToRemove[oldSceneNode.id] = oldSceneNode;
      }
    }
  }

  return {
    nodesToAdd: Object.values(nodesToAdd),
    nodesToUpdate: Object.values(nodesToUpdate),
    nodesToMove: Object.values(nodesToMove),
    nodesToRemove: Object.values(nodesToRemove),
  };
}
