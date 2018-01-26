import { createAssignMembers, generateId } from '../utils/utils';

export function mixinAssemblyModel(_, $) {
  const assignMembers = createAssignMembers(_, $);

  this::assignMembers({
    public: {
      type: 'assembly',
    },
    private: {
      completeModel: this::completeAssemblyModel,
      instantiateModel: this::instantiateAssemblyModel,
      downloadAssets: this::downloadAssemblyAssets,
    }
  });

  /** @private */
  async function completeAssemblyModel({ data, version, desc }) {

    this::assignMembers({
      public: {
        version,
        data,
        description: desc,
      },
      private: {
        content: data.content,
      },
    });

    return this;
  }

  /** @private */
  function downloadAssemblyAssets() {
    const { content, modelManager, runDownloadJobs } = _(this);

    const downloadJobs = content.map(item =>
        () => modelManager.getModelFromRepository(item.model)
            .then(model => (item.model = model).download()));

    return runDownloadJobs(downloadJobs);
  }

  /** @private */
  async function instantiateAssemblyModel(insertionParams) {
    const id = generateId();
    const { content, createContainer, createAssembly, coreInterface } = _(this);

    const specification = {...insertionParams, content, id};

    const containerProxy = createContainer({insertionParams, id});

    const assembly = createAssembly({...specification, containerProxy, coreInterface, model: this});

    $(specification.parent).addChild(assembly);

    return $(assembly).insert();
  }

}
