/**
 * Copyright (c) 2018-2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */
// Start imports present in base Viewer
import { createPluginUI } from '../../mol-plugin-ui';
import { PluginUIContext } from '../../mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from '../../mol-plugin-ui/spec';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginConfig } from '../../mol-plugin/config';
import { PluginLayoutControlsDisplay } from '../../mol-plugin/layout';
import { PluginSpec } from '../../mol-plugin/spec';

import { Color } from '../../mol-util/color';
import { renderReact18 } from '../../mol-plugin-ui/react18';
import '../../mol-util/polyfill';
import { SaccharideCompIdMapType } from '../../mol-model/structure/structure/carbohydrates/constants';
import { MolViewSpec } from '../../extensions/mvs/behavior';
import { loadMVSX } from '../../extensions/mvs/components/formats';
import { loadMVS } from '../../extensions/mvs/load';
import { MVSData } from '../../extensions/mvs/mvs-data';
import { Task } from '../../mol-task';

// Start import modifications
import { MolScriptBuilder as MS} from '../../mol-script/language/builder';
import { Script } from '../../mol-script/script';
import { parse } from '../../mol-script/transpile';
import {  StructureSelectionQuery, StructureSelectionQueries } from '../../mol-plugin-state/helpers/structure-selection-query'
import { TwoWayDictionary } from './helpers';
import { StructureProperties as Props, StructureProperties } from '../../mol-model/structure';
import { VolumeStreaming } from '../../mol-plugin/behavior/dynamic/volume-streaming/behavior';
import { StateSelection } from '../../mol-state';
import { StructureComponentManager } from '../../mol-plugin-state/manager/structure/component';
import { ParamDefinition } from '../../mol-util/param-definition';
import { StructureElement, StructureQuery } from '../../mol-model/structure';
import { StructureQueryHelper } from '../../mol-plugin-state/helpers/structure-query';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { StateBuilder, StateObjectSelector } from '../../mol-state';
import { Phenix } from './phenix';
import { StructureRepresentation3D } from '../../mol-plugin-state/transforms/representation';
import { CreateVolumeStreamingBehavior, InitVolumeStreaming } from '../../mol-plugin/behavior/dynamic/volume-streaming/transformers';
import { ApiRequest, MolstarState } from './api';
import { PluginContext } from '../../mol-plugin/context';


export const ExtensionMap = {
    // 'volseg': PluginSpec.Behavior(Volseg),
    // 'backgrounds': PluginSpec.Behavior(Backgrounds),
    // 'dnatco-ntcs': PluginSpec.Behavior(DnatcoNtCs),
    // 'pdbe-structure-quality-report': PluginSpec.Behavior(PDBeStructureQualityReport),
    // 'assembly-symmetry': PluginSpec.Behavior(AssemblySymmetry),
    // 'rcsb-validation-report': PluginSpec.Behavior(RCSBValidationReport),
    // 'anvil-membrane-orientation': PluginSpec.Behavior(ANVILMembraneOrientation),
    // 'g3d': PluginSpec.Behavior(G3DFormat),
    // 'model-export': PluginSpec.Behavior(ModelExport),
    // 'mp4-export': PluginSpec.Behavior(Mp4Export),
    // 'geo-export': PluginSpec.Behavior(GeometryExport),
    // 'ma-quality-assessment': PluginSpec.Behavior(MAQualityAssessment),
    // 'zenodo-import': PluginSpec.Behavior(ZenodoImport),
    // 'sb-ncbr-partial-charges': PluginSpec.Behavior(SbNcbrPartialCharges),
    // 'wwpdb-chemical-component-dictionary': PluginSpec.Behavior(wwPDBChemicalComponentDictionary),
    'mvs': PluginSpec.Behavior(MolViewSpec),
    // 'tunnels': PluginSpec.Behavior(SbNcbrTunnels),
};


const DefaultViewerOptions = {
    layoutIsExpanded: true,
    layoutShowControls: true,
    layoutShowRemoteState: true,
    layoutControlsDisplay: 'reactive' as PluginLayoutControlsDisplay,
    layoutShowSequence: true,
    layoutShowLog: true,
    layoutShowLeftPanel: true,
    collapseLeftPanel: false,
    collapseRightPanel: false,
    disableAntialiasing: PluginConfig.General.DisableAntialiasing.defaultValue,
    pixelScale: PluginConfig.General.PixelScale.defaultValue,
    pickScale: PluginConfig.General.PickScale.defaultValue,
    allowMajorPerformanceCaveat: PluginConfig.General.AllowMajorPerformanceCaveat.defaultValue,
    powerPreference: PluginConfig.General.PowerPreference.defaultValue,
    viewportShowExpand: PluginConfig.Viewport.ShowExpand.defaultValue,
    viewportShowControls: false,
    viewportShowSettings: PluginConfig.Viewport.ShowSettings.defaultValue,
    viewportShowSelectionMode: false,
    viewportShowAnimation: false,
    viewportShowTrajectoryControls: PluginConfig.Viewport.ShowTrajectoryControls.defaultValue,
    pluginStateServer: PluginConfig.State.DefaultServer.defaultValue,
    volumeStreamingServer: PluginConfig.VolumeStreaming.DefaultServer.defaultValue,
    volumeStreamingDisabled: !PluginConfig.VolumeStreaming.Enabled.defaultValue,
    saccharideCompIdMapType: 'default' as SaccharideCompIdMapType,
};
type ViewerOptions = typeof DefaultViewerOptions;

export class PhenixViewer {
    // Attributes
    connection_id: string | undefined = undefined; // to record if the python viewer has connected

    // make some library components available for debugging
    Props = Props;
    StructureElement = StructureElement;
    StructureProperties = StructureProperties;
    StructureComponentManager = StructureComponentManager;
    StructureSelectionQuery = StructureSelectionQuery;
    StructureSelectionQueries = StructureSelectionQueries;
    StructureQueryHelper = StructureQueryHelper
    ParamDefinition = ParamDefinition;
    VolumeStreaming = VolumeStreaming;
    CreateVolumeStreamingBehavior = CreateVolumeStreamingBehavior;
    StateSelection = StateSelection;
    InitVolumeStreaming = InitVolumeStreaming;
    // Instance variables
    selectedParams: any;
    app: any;
    //debugQuery = debugQuery;
    isHighlightColorUpdated: boolean;
    objectStoragePhenix = new TwoWayDictionary<string, any>(); // phenixKey: DataClass JSON serializable object
    objectStorageMolstar = new TwoWayDictionary<string, any>(); // molstarKey: molstar internal object
    keyMapPhenixToMolstar = new TwoWayDictionary<string, string>(); // phenixKey: molstarKey
    defaultRendererProps: any;
    volumeServerURL: string;
    hasSynced = false;
    hasVolumes = false;
    isFocused = false;
    phenixState = new MolstarState();
    currentSelExpression: any;
    StateObjectSelector = StateObjectSelector;
    MS = MS;
    parse = parse;
    Script = Script;
    StructureRepresentation3D = StructureRepresentation3D;
    Color = Color;
    PluginContext = PluginContext;
    StateBuilder = StateBuilder;
    PluginCommands = PluginCommands;
    StateTransforms = StateTransforms;
    StructureQuery = StructureQuery;

    constructor(public plugin: PluginUIContext) {
        // Save renderer defaults
        this.defaultRendererProps = { ...this.plugin.canvas3d!.props.renderer };
    }
    // All api functions are defined in a second file, 
    //   (phenix.ts) and bound to the viewer class in the .phenix. namespace
    phenix = {
        // API methods
        pollStructures: Phenix.pollStructures.bind(this),
        selectAll: Phenix.selectAll.bind(this),
        deselectAll: Phenix.deselectAll.bind(this),
        //start_express: Phenix.start_express.bind(this),



        // Old, need to identify unused.
        cameraMode: Phenix.cameraMode.bind(this),
        postInit: Phenix.postInit.bind(this),
        loadStructureFromPdbString: Phenix.loadStructureFromPdbString.bind(this),
        generateUniqueKey: Phenix.generateUniqueKey.bind(this),
        //getState: Phenix.getState.bind(this),
        setState: Phenix.setState.bind(this),
        updateFromExternal: Phenix.updateFromExternal.bind(this),
        getSel: Phenix.getSel.bind(this),
        pollSelection: Phenix.pollSelection.bind(this),
        focusSelected: Phenix.focusSelected.bind(this),
        toggleSelectionMode: Phenix.toggleSelectionMode.bind(this),
        colorSelection: Phenix.colorSelection.bind(this),
        queryAll: Phenix.queryAll.bind(this),
        clearSelection: Phenix.clearSelection.bind(this),
        clearAll: Phenix.clearAll.bind(this),
        normalizeColor: Phenix.normalizeColor.bind(this),
        debugQuery: Phenix.debugQuery.bind(this),
        getThemeParams: Phenix.getThemeParams.bind(this),
        addRepresentationSelected: Phenix.addRepresentationSelected.bind(this),
        checkSingleEntry: Phenix.checkSingleEntry.bind(this),
        getStructureForRef: Phenix.getStructureForRef.bind(this),
        getSelectedLoci: Phenix.getSelectedLoci.bind(this),
        getSelectedStructure: Phenix.getSelectedStructure.bind(this),
        queryFromExpression: Phenix.queryFromExpression.bind(this),
        selectFromQuery: Phenix.selectFromQuery.bind(this),
        selectFromSel: Phenix.selectFromSel.bind(this),
        getLocations: Phenix.getLocations.bind(this),
        getLociStats: Phenix.getLociStats.bind(this),
        setTransparencyQuery: Phenix.setTransparencyQuery.bind(this),


    };
    async process_request(data: string): Promise<any> {
        try {
            // Assume Request.fromJSON is defined elsewhere
            const request = ApiRequest.fromJSON(data);

            // Process the request (handle both sync and async cases)
            await Promise.resolve(request.data.run(this));
            return request.toJSON();  // Return the successful output
        } catch (error) {
            // Return an error message if something went wrong
            return { error: error.message || 'Unknown error in PhenixViewer process_request()' };
        }
        }
    static async create(elementOrId: string | HTMLElement, options: Partial<ViewerOptions> = {}) {

        const definedOptions = {} as any;
        // filter for defined properies only so the default values
        // are property applied
        for (const p of Object.keys(options) as (keyof ViewerOptions)[]) {
            if (options[p] !== void 0) definedOptions[p] = options[p];
        }

        const o: ViewerOptions = { ...DefaultViewerOptions, ...definedOptions };
        const defaultSpec = DefaultPluginUISpec();

        const spec: PluginUISpec = {
            actions: defaultSpec.actions,
            behaviors: [
                ...defaultSpec.behaviors,            ],
            animations: [...defaultSpec.animations || []],
            customParamEditors: defaultSpec.customParamEditors,
            layout: {
                initial: {
                    isExpanded: o.layoutIsExpanded,
                    showControls: false, // this is critical for a clean ui
                    controlsDisplay: o.layoutControlsDisplay,
                    regionState: {
                        bottom: 'full',
                        left: o.collapseLeftPanel ? 'collapsed' : 'full',
                        right: o.collapseRightPanel ? 'hidden' : 'full',
                        top: 'full',
                    }
                },
            },
            components: {
                ...defaultSpec.components,
                controls: {
                    ...defaultSpec.components?.controls,
                    top: o.layoutShowSequence ? undefined : 'none',
                    bottom: o.layoutShowLog ? undefined : 'none',
                    left: o.layoutShowLeftPanel ? undefined : 'none',
                },
                remoteState: o.layoutShowRemoteState ? 'default' : 'none',
            },
            canvas3d: {
                camera: {
                    helper: { axes: { name: 'off', params: {} } }
                },
            },
            config: [
                [PluginConfig.General.DisableAntialiasing, o.disableAntialiasing],
                [PluginConfig.General.PixelScale, o.pixelScale],
                [PluginConfig.General.PickScale, o.pickScale],
                [PluginConfig.General.AllowMajorPerformanceCaveat, o.allowMajorPerformanceCaveat],
                [PluginConfig.General.PowerPreference, o.powerPreference],
                [PluginConfig.Viewport.ShowSettings, o.viewportShowSettings],
                [PluginConfig.Viewport.ShowExpand, false],
                [PluginConfig.Viewport.ShowControls, false],
                [PluginConfig.Viewport.ShowSelectionMode, false],
                [PluginConfig.State.DefaultServer, o.pluginStateServer],
                [PluginConfig.State.CurrentServer, o.pluginStateServer],
                [PluginConfig.VolumeStreaming.DefaultServer, o.volumeStreamingServer],
                [PluginConfig.VolumeStreaming.Enabled, !o.volumeStreamingDisabled],
                //[PluginConfig.Structure.DefaultRepresentationPreset, ViewerAutoPreset.id],
                [PluginConfig.Structure.SaccharideCompIdMapType, o.saccharideCompIdMapType],
            ]
        };

        const element = typeof elementOrId === 'string'
            ? document.getElementById(elementOrId)
            : elementOrId;
        if (!element) throw new Error(`Could not get element with id '${elementOrId}'`);
        const plugin = await createPluginUI({
            target: element,
            spec,
            render: renderReact18,
            onBeforeUIRender: plugin => {
                // the preset needs to be added before the UI renders otherwise
                // "Download Structure" wont be able to pick it up
                //plugin.builders.structure.representation.registerPreset(ViewerAutoPreset);
            }
        });
        return new PhenixViewer(plugin);
    }
    
    async loadMvsFromUrl(url: string, format: 'mvsj' | 'mvsx', options?: { replaceExisting?: boolean, keepCamera?: boolean }) {
        if (format === 'mvsj') {
            const data = await this.plugin.runTask(this.plugin.fetch({ url, type: 'string' }));
            const mvsData = MVSData.fromMVSJ(data);
            await loadMVS(this.plugin, mvsData, { sanityChecks: true, sourceUrl: url, ...options });
        } else if (format === 'mvsx') {
            const data = await this.plugin.runTask(this.plugin.fetch({ url, type: 'binary' }));
            await this.plugin.runTask(Task.create('Load MVSX file', async ctx => {
                const parsed = await loadMVSX(this.plugin, ctx, data);
                await loadMVS(this.plugin, parsed.mvsData, { sanityChecks: true, sourceUrl: parsed.sourceUrl, ...options });
            }));
        } else {
            throw new Error(`Unknown MolViewSpec format: ${format}`);
        }
    }

    /** Load MolViewSpec from `data`.
     * If `format` is 'mvsj', `data` must be a string or a Uint8Array containing a UTF8-encoded string.
     * If `format` is 'mvsx', `data` must be a Uint8Array or a string containing base64-encoded binary data prefixed with 'base64,'. */
    async loadMvsData(data: string | Uint8Array, format: 'mvsj' | 'mvsx', options?: { replaceExisting?: boolean, keepCamera?: boolean }) {
        console.log("hello")
        if (typeof data === 'string' && data.startsWith('base64')) {
            data = Uint8Array.from(atob(data.substring(7)), c => c.charCodeAt(0)); // Decode base64 string to Uint8Array
        }
        if (format === 'mvsj') {
            if (typeof data !== 'string') {
                data = new TextDecoder().decode(data); // Decode Uint8Array to string using UTF8
            }
            const mvsData = MVSData.fromMVSJ(data);
            await loadMVS(this.plugin, mvsData, { sanityChecks: true, sourceUrl: undefined, ...options });
        } else if (format === 'mvsx') {
            if (typeof data === 'string') {
                throw new Error("loadMvsData: if `format` is 'mvsx', then `data` must be a Uint8Array or a base64-encoded string prefixed with 'base64,'.");
            }
            await this.plugin.runTask(Task.create('Load MVSX file', async ctx => {
                const parsed = await loadMVSX(this.plugin, ctx, data as Uint8Array);
                await loadMVS(this.plugin, parsed.mvsData, { sanityChecks: true, sourceUrl: parsed.sourceUrl, ...options });
            }));
        } else {
            throw new Error(`Unknown MolViewSpec format: ${format}`);
        }
    }
    handleResize() {
        this.plugin.layout.events.updated.next(void 0);
    }
    dispose() {
        this.plugin.dispose();
    }
  }
  export const PluginExtensions = {
    //wwPDBStructConn: wwPDBStructConnExtensionFunctions,
    mvs: { MVSData, loadMVS },
};


(window as any).PhenixViewer = PhenixViewer;