const { createApp, createExample, createBrowserTest } = require('./webpack.config.common.js');

const examples = ['proteopedia-wrapper', 'basic-wrapper', 'lighting', 'alpha-orbitals'];
const tests = [
    'font-atlas',
    'marching-cubes',
    'render-lines', 'render-mesh', 'render-shape', 'render-spheres', 'render-structure', 'render-structure-grid', 'render-text',
    'parse-xtc'
];

module.exports = [
    {
        resolve: {
          alias: {
            '@molstar': path.resolve(__dirname, "/Users/user/software/debug/modules/molstar/src/"),
          },
        },
      },
    createApp('phenix-viewer', 'molstar'),
    createApp('viewer', 'molstar'),
    createApp('docking-viewer', 'molstar'),
    createApp('mesoscale-explorer', 'molstar'),
    ...examples.map(createExample),
    ...tests.map(createBrowserTest)
];
