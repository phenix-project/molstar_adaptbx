/**
 * Copyright (c) 2018-2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

//import { G3dProvider } from '../../extensions/g3d/format';
import { VolsegVolumeServerConfig } from '../../extensions/volumes-and-segmentations';
//import { QualityAssessmentPLDDTPreset, QualityAssessmentQmeanPreset } from '../../extensions/model-archive/quality-assessment/behavior';
//import { QualityAssessment } from '../../extensions/model-archive/quality-assessment/prop';
import { StructureRepresentationPresetProvider } from '../../mol-plugin-state/builder/structure/representation-preset';
// import { DataFormatProvider } from '../../mol-plugin-state/formats/provider';
import { createPluginUI } from '../../mol-plugin-ui';
import { PluginUIContext } from '../../mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from '../../mol-plugin-ui/spec';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginConfig } from '../../mol-plugin/config';
import { PluginLayoutControlsDisplay } from '../../mol-plugin/layout';
//import { StateObjectRef} from '../../mol-state';
import { Color } from '../../mol-util/color';
import { renderReact18 } from '../../mol-plugin-ui/react18';
import '../../mol-util/polyfill';
// import { ObjectKeys } from '../../mol-util/type-helpers';
import { SaccharideCompIdMapType } from '../../mol-model/structure/structure/carbohydrates/constants';
//import { SbNcbrPartialChargesPreset, SbNcbrPartialChargesPropertyProvider } from '../../extensions/sb-ncbr';

// Start import modifications
import { MolScriptBuilder as MS} from '../../mol-script/language/builder';
import {  StructureSelectionQuery, StructureSelectionQueries } from '../../mol-plugin-state/helpers/structure-selection-query'
import { TwoWayDictionary, PhenixStateClass } from './helpers';
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
// End import modifications

// const CustomFormats = [
//     ['g3d', G3dProvider] as const
// ];
import { PluginContext } from '../../mol-plugin/context';



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
    pdbProvider: PluginConfig.Download.DefaultPdbProvider.defaultValue,
    emdbProvider: PluginConfig.Download.DefaultEmdbProvider.defaultValue,
    saccharideCompIdMapType: 'default' as SaccharideCompIdMapType,
    volumesAndSegmentationsDefaultServer: VolsegVolumeServerConfig.DefaultServer.defaultValue,
};
type ViewerOptions = typeof DefaultViewerOptions;

export class Viewer {
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
    phenixState = new PhenixStateClass();
    currentSelExpression: any;
    StateObjectSelector = StateObjectSelector;
    MS = MS;
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
    // all api functions are defined in a second file, (phenix.ts) and bound to the viewer class
    phenix = {
        // API methods
        pollStructures: Phenix.pollStructures.bind(this),
        selectAll: Phenix.selectAll.bind(this),
        deselectAll: Phenix.deselectAll.bind(this),



        // Old
        cameraMode: Phenix.cameraMode.bind(this),
        postInit: Phenix.postInit.bind(this),
        // getLociForParams: Phenix.getLociForParams.bind(this),
        loadStructureFromPdbString: Phenix.loadStructureFromPdbString.bind(this),
        generateUniqueKey: Phenix.generateUniqueKey.bind(this),
        getState: Phenix.getState.bind(this),
        setState: Phenix.setState.bind(this),
        // getQueryFromLoci: Phenix.getQueryFromLoci.bind(this),
        updateFromExternal: Phenix.updateFromExternal.bind(this),
        //getQueryJSONFromLoci: Phenix.getQueryJSONFromLoci.bind(this),
        getSel: Phenix.getSel.bind(this),
        pollSelection: Phenix.pollSelection.bind(this),
        focusSelected: Phenix.focusSelected.bind(this),
        toggleSelectionMode: Phenix.toggleSelectionMode.bind(this),
        // select: Phenix.select.bind(this),
        //setColor: Phenix.setColor.bind(this),
        colorSelection: Phenix.colorSelection.bind(this),
        //setColorSelected: Phenix.setColorSelected.bind(this),
        queryAll: Phenix.queryAll.bind(this),
        
       //queryCurrent: Phenix.queryCurrent.bind(this),
        //setCurrentSelExpression: Phenix.setCurrentSelExpression.bind(this),
        clearSelection: Phenix.clearSelection.bind(this),
        clearAll: Phenix.clearAll.bind(this),
        // getColorOfSelection: Phenix.getColorOfSelection.bind(this),
        // setQueryColor: Phenix.setQueryColor.bind(this),
        normalizeColor: Phenix.normalizeColor.bind(this),
        // getQueryAll: Phenix.getQueryAll.bind(this),
        debugQuery: Phenix.debugQuery.bind(this),
        getThemeParams: Phenix.getThemeParams.bind(this),
        addRepresentationSelected: Phenix.addRepresentationSelected.bind(this),
        //removeRepresentationSelected: Phenix.removeRepresentationSelected.bind(this),
        //getRepresentation: Phenix.getRepresentation.bind(this),
        //removeRepr: Phenix.removeRepr.bind(this),
        checkSingleEntry: Phenix.checkSingleEntry.bind(this),
        getStructureForRef: Phenix.getStructureForRef.bind(this),
        getSelectedLoci: Phenix.getSelectedLoci.bind(this),
        getSelectedStructure: Phenix.getSelectedStructure.bind(this),
        queryFromExpression: Phenix.queryFromExpression.bind(this),
        selectFromQuery: Phenix.selectFromQuery.bind(this),
        selectFromSel: Phenix.selectFromSel.bind(this),
        // queryFromJSON: Phenix.queryFromJSON.bind(this),

        // getSelectedQuery: Phenix.getSelectedQuery.bind(this),
        getLocations: Phenix.getLocations.bind(this),
        getLociStats: Phenix.getLociStats.bind(this),
        //getAllRepresentations: Phenix.getAllRepresentations.bind(this),
        // getRepresentation: Phenix.getRepresentation.bind(this),
        setTransparencyQuery: Phenix.setTransparencyQuery.bind(this),
        //setTransparencySelected: Phenix.setTransparencySelected.bind(this),
        volumeRefBehavior: Phenix.volumeRefBehavior.bind(this),
        volumeRefInfo: Phenix.volumeRefInfo.bind(this),
        getVolumeEntry: Phenix.getVolumeEntry.bind(this),
        loadMap: Phenix.loadMap.bind(this),
        syncReferences: Phenix.syncReferences.bind(this),
        //syncStyle: Phenix.syncStyle.bind(this),

    };
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
        return new Viewer(plugin);
    }
    
    handleResize() {
        this.plugin.layout.events.updated.next(void 0);
    }
  }


  
export interface LoadStructureOptions {
    representationParams?: StructureRepresentationPresetProvider.CommonParams
}

// export const ViewerAutoPreset = StructureRepresentationPresetProvider({
//     id: 'preset-structure-representation-viewer-auto',
//     display: {
//         name: 'Automatic (w/ Annotation)', group: 'Annotation',
//         description: 'Show standard automatic representation but colored by quality assessment (if available in the model).'
//     },
//     isApplicable(a) {
//         return (
//             !!a.data.models.some(m => QualityAssessment.isApplicable(m, 'pLDDT')) ||
//             !!a.data.models.some(m => QualityAssessment.isApplicable(m, 'qmean'))
//         );
//     },
//     params: () => StructureRepresentationPresetProvider.CommonParams,
//     async apply(ref, params, plugin) {
//         const structureCell = StateObjectRef.resolveAndCheck(plugin.state.data, ref);
//         const structure = structureCell?.obj?.data;
//         if (!structureCell || !structure) return {};

//         if (!!structure.models.some(m => QualityAssessment.isApplicable(m, 'pLDDT'))) {
//             return await QualityAssessmentPLDDTPreset.apply(ref, params, plugin);
//         } else if (!!structure.models.some(m => QualityAssessment.isApplicable(m, 'qmean'))) {
//             return await QualityAssessmentQmeanPreset.apply(ref, params, plugin);
//         } else if (!!structure.models.some(m => SbNcbrPartialChargesPropertyProvider.isApplicable(m))) {
//             return await SbNcbrPartialChargesPreset.apply(ref, params, plugin);
//         } else {
//             return await PresetStructureRepresentations.auto.apply(ref, params, plugin);
//         }
//     }
// });