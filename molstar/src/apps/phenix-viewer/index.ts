/**
 * Copyright (c) 2018-2022 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

//import './embedded.html';
import './favicon.ico';
import './index.html';
require('mol-plugin-ui/skin/light.scss');
// Import PhenixViewer from the 'app.ts'
import { PhenixViewer } from './app';

// Export PhenixViewer so it's usable in modules
export { PhenixViewer };

// Attach PhenixViewer to the global molstar object
(window as any).PhenixViewer = PhenixViewer;