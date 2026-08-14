import * as yaml from 'js-yaml-modern';

const compatibilityApi = {
  ...yaml,
  safeLoad: yaml.load,
  safeLoadAll: yaml.loadAll,
  safeDump: yaml.dump
};

export default compatibilityApi;
export * from 'js-yaml-modern';
