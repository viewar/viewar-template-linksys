import { createAssignMembers } from '../utils/utils';

export function mixinReferenceModel(_, $) {
  const assignMembers = createAssignMembers(_, $);

  this::assignMembers({
    public: {
      type: 'reference',
    },
    private: {
      completeModel: this::completeReferenceModel,
      instantiateModel: this::instantiateReferenceModel,
      downloadAssets: this::downloadReferenceAssets,
    }
  });

  /** @private */
  async function completeReferenceModel({ data, references, version, desc }) {
    return this::assignMembers({
      public: {
        version,
        data,
        description: desc,
      },
      private: {
        references,
      }
    });
  }

  /** @private */
  function downloadReferenceAssets() {
    return _(this).runDownloadJobs(_(this).references.map(reference => () =>
      _(this).modelManager.getModelFromRepository(reference.id).then(async (model) => {
        if (!model) {
          throw new Error('Model not found in database.');
        }
        await model.download();
      } )
    ));
  }

  /** @private */
  async function instantiateReferenceModel(specification) {
    const { references, walkCamera, modelManager, createContainer } = _(this);

    const container = createContainer({...specification, type: 'ungrouped'});
    $(specification.parent).addChild(container);

    await $(container).insert();

    for (const {id, name, pose} of references) {
      const model = await modelManager.getModelFromRepository(id);
      await model.download();
      await $(model).instantiate({parent: container, pose, visible: !/panorama/i.exec(name) || walkCamera.active});
    }
    return container;
  }

}
