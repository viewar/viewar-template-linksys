export function createFreezeFrame({name, coreInterface}) {
  return {
    name,
    thumbnailUrl: coreInterface.resolveUrl('Freezeframes/General/' + name + '_thumb.png'),
    imageUrl: coreInterface.resolveUrl('Freezeframes/General/' + name + '.png'),
  };
}
