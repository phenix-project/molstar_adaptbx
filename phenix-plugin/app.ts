/**
 * Copyright (c) 2018-2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { G3dProvider } from '../../extensions/g3d/format';
import { VolsegVolumeServerConfig } from '../../extensions/volumes-and-segmentations';
import { QualityAssessmentPLDDTPreset, QualityAssessmentQmeanPreset } from '../../extensions/model-archive/quality-assessment/behavior';
import { QualityAssessment } from '../../extensions/model-archive/quality-assessment/prop';
import { Volume } from '../../mol-model/volume';
import { DownloadStructure, PdbDownloadProvider } from '../../mol-plugin-state/actions/structure';
import { DownloadDensity } from '../../mol-plugin-state/actions/volume';
import { PresetTrajectoryHierarchy } from '../../mol-plugin-state/builder/structure/hierarchy-preset';
import { PresetStructureRepresentations, StructureRepresentationPresetProvider } from '../../mol-plugin-state/builder/structure/representation-preset';
import { DataFormatProvider } from '../../mol-plugin-state/formats/provider';
import { BuiltInTopologyFormat } from '../../mol-plugin-state/formats/topology';
import { BuiltInCoordinatesFormat } from '../../mol-plugin-state/formats/coordinates';
import { BuiltInTrajectoryFormat } from '../../mol-plugin-state/formats/trajectory';
import { BuildInVolumeFormat } from '../../mol-plugin-state/formats/volume';
import { createVolumeRepresentationParams } from '../../mol-plugin-state/helpers/volume-representation-params';
import { PluginStateObject } from '../../mol-plugin-state/objects';
import { TrajectoryFromModelAndCoordinates } from '../../mol-plugin-state/transforms/model';
import { createPluginUI } from '../../mol-plugin-ui/react18';
import { PluginUIContext } from '../../mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from '../../mol-plugin-ui/spec';
import { PluginCommands } from '../../mol-plugin/commands';
import { PluginConfig } from '../../mol-plugin/config';
import { PluginLayoutControlsDisplay } from '../../mol-plugin/layout';
import { PluginState } from '../../mol-plugin/state';
import { StateObjectRef} from '../../mol-state';
import { Asset } from '../../mol-util/assets';
import { Color } from '../../mol-util/color';
import '../../mol-util/polyfill';
import { ObjectKeys } from '../../mol-util/type-helpers';
import { SaccharideCompIdMapType } from '../../mol-model/structure/structure/carbohydrates/constants';
import { SbNcbrPartialChargesPreset, SbNcbrPartialChargesPropertyProvider } from '../../extensions/sb-ncbr';

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
export { PLUGIN_VERSION as version } from '../../mol-plugin/version';
export { setDebugMode, setProductionMode, setTimingMode, consoleStats } from '../../mol-util/debug';

const CustomFormats = [
    ['g3d', G3dProvider] as const
];
import { PluginContext } from '../../mol-plugin/context';



export const ExtensionMap = {
    // 'volseg': PluginSpec.Behavior(Volseg),
    // 'backgrounds': PluginSpec.Behavior(Backgrounds),
    // 'cellpack': PluginSpec.Behavior(CellPack),
    // 'dnatco-ntcs': PluginSpec.Behavior(DnatcoNtCs),
    // 'pdbe-structure-quality-report': PluginSpec.Behavior(PDBeStructureQualityReport),
    // 'rcsb-assembly-symmetry': PluginSpec.Behavior(RCSBAssemblySymmetry),
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
};

const DefaultViewerOptions = {
    customFormats: CustomFormats as [string, DataFormatProvider][],
    extensions: ObjectKeys(ExtensionMap),
    disabledExtensions: [] as string[],
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
    pickPadding: PluginConfig.General.PickPadding.defaultValue,
    enableWboit: PluginConfig.General.EnableWboit.defaultValue,
    enableDpoit: PluginConfig.General.EnableDpoit.defaultValue,
    preferWebgl1: PluginConfig.General.PreferWebGl1.defaultValue,
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
    // all extra functions are defined in a second file and bound to keep this file as unchanged as possible.
    // TODO: Probably better to transition to subclass
    phenix = {
        cameraMode: Phenix.cameraMode.bind(this),
        postInit: Phenix.postInit.bind(this),
        // getLociForParams: Phenix.getLociForParams.bind(this),
        loadStructureFromPdbString: Phenix.loadStructureFromPdbString.bind(this),
        pollStructures: Phenix.pollStructures.bind(this),
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
        selectAll: Phenix.selectAll.bind(this),
       //queryCurrent: Phenix.queryCurrent.bind(this),
        //setCurrentSelExpression: Phenix.setCurrentSelExpression.bind(this),
        deselectAll: Phenix.deselectAll.bind(this),
        clearSelection: Phenix.clearSelection.bind(this),
        clearAll: Phenix.clearAll.bind(this),
        // getColorOfSelection: Phenix.getColorOfSelection.bind(this),
        // setQueryColor: Phenix.setQueryColor.bind(this),
        normalizeColor: Phenix.normalizeColor.bind(this),
        // getQueryAll: Phenix.getQueryAll.bind(this),
        debugLoadModel: Phenix.debugLoadModel.bind(this),
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

        const disabledExtension = new Set(o.disabledExtensions ?? []);

        const spec: PluginUISpec = {
            actions: defaultSpec.actions,
            behaviors: [
                ...defaultSpec.behaviors,
                ...o.extensions.filter(e => !disabledExtension.has(e)).map(e => ExtensionMap[e]),
            ],
            animations: [...defaultSpec.animations || []],
            customParamEditors: defaultSpec.customParamEditors,
            customFormats: o?.customFormats,
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
                [PluginConfig.General.PickPadding, o.pickPadding],
                [PluginConfig.General.EnableWboit, o.enableWboit],
                [PluginConfig.General.EnableDpoit, o.enableDpoit],
                [PluginConfig.General.PreferWebGl1, o.preferWebgl1],
                [PluginConfig.General.AllowMajorPerformanceCaveat, o.allowMajorPerformanceCaveat],
                [PluginConfig.General.PowerPreference, o.powerPreference],
                [PluginConfig.Viewport.ShowSettings, o.viewportShowSettings],
                [PluginConfig.Viewport.ShowExpand, false],
                [PluginConfig.Viewport.ShowControls, false],
                [PluginConfig.Viewport.ShowSelectionMode, false],
                [PluginConfig.Viewport.ShowAnimation, false],
                [PluginConfig.Viewport.ShowTrajectoryControls, o.viewportShowTrajectoryControls],
                [PluginConfig.State.DefaultServer, o.pluginStateServer],
                [PluginConfig.State.CurrentServer, o.pluginStateServer],
                [PluginConfig.VolumeStreaming.DefaultServer, o.volumeStreamingServer],
                [PluginConfig.VolumeStreaming.Enabled, !o.volumeStreamingDisabled],
                [PluginConfig.Download.DefaultPdbProvider, o.pdbProvider],
                [PluginConfig.Download.DefaultEmdbProvider, o.emdbProvider],
                [PluginConfig.Structure.DefaultRepresentationPreset, ViewerAutoPreset.id],
                [PluginConfig.Structure.SaccharideCompIdMapType, o.saccharideCompIdMapType],
                [VolsegVolumeServerConfig.DefaultServer, o.volumesAndSegmentationsDefaultServer],
            ]
        };

        const element = typeof elementOrId === 'string'
            ? document.getElementById(elementOrId)
            : elementOrId;
        if (!element) throw new Error(`Could not get element with id '${elementOrId}'`);
        const plugin = await createPluginUI(element, spec, {
            onBeforeUIRender: plugin => {
                // the preset needs to be added before the UI renders otherwise
                // "Download Structure" wont be able to pick it up
                plugin.builders.structure.representation.registerPreset(ViewerAutoPreset);
            }
        });
        return new Viewer(plugin);
    }
    setRemoteSnapshot(id: string) {
        const url = `${this.plugin.config.get(PluginConfig.State.CurrentServer)}/get/${id}`;
        return PluginCommands.State.Snapshots.Fetch(this.plugin, { url });
    }

    loadSnapshotFromUrl(url: string, type: PluginState.SnapshotType) {
        return PluginCommands.State.Snapshots.OpenUrl(this.plugin, { url, type });
    }

    loadStructureFromUrl(url: string, format: BuiltInTrajectoryFormat = 'mmcif', isBinary = false, options?: LoadStructureOptions & { label?: string }) {
        const params = DownloadStructure.createDefaultParams(this.plugin.state.data.root.obj!, this.plugin);
        return this.plugin.runTask(this.plugin.state.data.applyAction(DownloadStructure, {
            source: {
                name: 'url',
                params: {
                    url: Asset.Url(url),
                    format: format as any,
                    isBinary,
                    label: options?.label,
                    options: { ...params.source.params.options, representationParams: options?.representationParams as any },
                }
            }
        }));
    }

    async loadAllModelsOrAssemblyFromUrl(url: string, format: BuiltInTrajectoryFormat = 'mmcif', isBinary = false, options?: LoadStructureOptions) {
        const plugin = this.plugin;

        const data = await plugin.builders.data.download({ url, isBinary }, { state: { isGhost: true } });
        const trajectory = await plugin.builders.structure.parseTrajectory(data, format);

        await this.plugin.builders.structure.hierarchy.applyPreset(trajectory, 'all-models', { useDefaultIfSingleModel: true, representationPresetParams: options?.representationParams });
    }

    async loadStructureFromData(data: string | number[], format: BuiltInTrajectoryFormat, options?: { dataLabel?: string }) {
        const _data = await this.plugin.builders.data.rawData({ data: data, label: options?.dataLabel });
        const trajectory = await this.plugin.builders.structure.parseTrajectory(_data, format);
        await this.plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');
    }

    loadPdb(pdb: string, options?: LoadStructureOptions) {
        const params = DownloadStructure.createDefaultParams(this.plugin.state.data.root.obj!, this.plugin);
        const provider = this.plugin.config.get(PluginConfig.Download.DefaultPdbProvider)!;
        return this.plugin.runTask(this.plugin.state.data.applyAction(DownloadStructure, {
            source: {
                name: 'pdb' as const,
                params: {
                    provider: {
                        id: pdb,
                        server: {
                            name: provider,
                            params: PdbDownloadProvider[provider].defaultValue as any
                        }
                    },
                    options: { ...params.source.params.options, representationParams: options?.representationParams as any },
                }
            }
        }));
    }

    loadPdbDev(pdbDev: string) {
        const params = DownloadStructure.createDefaultParams(this.plugin.state.data.root.obj!, this.plugin);
        return this.plugin.runTask(this.plugin.state.data.applyAction(DownloadStructure, {
            source: {
                name: 'pdb-dev' as const,
                params: {
                    provider: {
                        id: pdbDev,
                        encoding: 'bcif',
                    },
                    options: params.source.params.options,
                }
            }
        }));
    }

    loadEmdb(emdb: string, options?: { detail?: number }) {
        const provider = this.plugin.config.get(PluginConfig.Download.DefaultEmdbProvider)!;
        return this.plugin.runTask(this.plugin.state.data.applyAction(DownloadDensity, {
            source: {
                name: 'pdb-emd-ds' as const,
                params: {
                    provider: {
                        id: emdb,
                        server: provider,
                    },
                    detail: options?.detail ?? 3,
                }
            }
        }));
    }

    loadAlphaFoldDb(afdb: string) {
        const params = DownloadStructure.createDefaultParams(this.plugin.state.data.root.obj!, this.plugin);
        return this.plugin.runTask(this.plugin.state.data.applyAction(DownloadStructure, {
            source: {
                name: 'alphafolddb' as const,
                params: {
                    id: afdb,
                    options: {
                        ...params.source.params.options,
                        representation: 'preset-structure-representation-ma-quality-assessment-plddt'
                    },
                }
            }
        }));
    }

    loadModelArchive(id: string) {
        const params = DownloadStructure.createDefaultParams(this.plugin.state.data.root.obj!, this.plugin);
        return this.plugin.runTask(this.plugin.state.data.applyAction(DownloadStructure, {
            source: {
                name: 'modelarchive' as const,
                params: {
                    id,
                    options: params.source.params.options,
                }
            }
        }));
    }

    /**
     * @example Load X-ray density from volume server
        viewer.loadVolumeFromUrl({
            url: 'https://www.ebi.ac.uk/pdbe/densities/x-ray/1tqn/cell?detail=3',
            format: 'dscif',
            isBinary: true
        }, [{
            type: 'relative',
            value: 1.5,
            color: 0x3362B2
        }, {
            type: 'relative',
            value: 3,
            color: 0x33BB33,
            volumeIndex: 1
        }, {
            type: 'relative',
            value: -3,
            color: 0xBB3333,
            volumeIndex: 1
        }], {
            entryId: ['2FO-FC', 'FO-FC'],
            isLazy: true
        });
     * *********************
     * @example Load EM density from volume server
        viewer.loadVolumeFromUrl({
            url: 'https://maps.rcsb.org/em/emd-30210/cell?detail=6',
            format: 'dscif',
            isBinary: true
        }, [{
            type: 'relative',
            value: 1,
            color: 0x3377aa
        }], {
            entryId: 'EMD-30210',
            isLazy: true
        });
     */
    async loadVolumeFromUrl({ url, format, isBinary }: { url: string, format: BuildInVolumeFormat, isBinary: boolean }, isovalues: VolumeIsovalueInfo[], options?: { entryId?: string | string[], isLazy?: boolean }) {
        const plugin = this.plugin;

        if (!plugin.dataFormats.get(format)) {
            throw new Error(`Unknown density format: ${format}`);
        }

        if (options?.isLazy) {
            const update = this.plugin.build();
            update.toRoot().apply(StateTransforms.Data.LazyVolume, {
                url,
                format,
                entryId: options?.entryId,
                isBinary,
                isovalues: isovalues.map(v => ({ alpha: 1, volumeIndex: 0, ...v }))
            });
            return update.commit();
        }

        return plugin.dataTransaction(async () => {
            const data = await plugin.builders.data.download({ url, isBinary }, { state: { isGhost: true } });

            const parsed = await plugin.dataFormats.get(format)!.parse(plugin, data, { entryId: options?.entryId });
            const firstVolume = (parsed.volume || parsed.volumes[0]) as StateObjectSelector<PluginStateObject.Volume.Data>;
            if (!firstVolume?.isOk) throw new Error('Failed to parse any volume.');

            const repr = plugin.build();
            for (const iso of isovalues) {
                const volume: StateObjectSelector<PluginStateObject.Volume.Data> = parsed.volumes?.[iso.volumeIndex ?? 0] ?? parsed.volume;
                const volumeData = volume.cell!.obj!.data;
                repr
                    .to(volume)
                    .apply(StateTransforms.Representation.VolumeRepresentation3D, createVolumeRepresentationParams(this.plugin, firstVolume.data!, {
                        type: 'isosurface',
                        typeParams: { alpha: iso.alpha ?? 1, isoValue: Volume.adjustedIsoValue(volumeData, iso.value, iso.type) },
                        color: 'uniform',
                        colorParams: { value: iso.color }
                    }));
            }

            await repr.commit();
        });
    }

    /**
     * @example
     *  viewer.loadTrajectory({
     *      model: { kind: 'model-url', url: 'villin.gro', format: 'gro' },
     *      coordinates: { kind: 'coordinates-url', url: 'villin.xtc', format: 'xtc', isBinary: true },
     *      preset: 'all-models' // or 'default'
     *  });
     */
    async loadTrajectory(params: LoadTrajectoryParams) {
        const plugin = this.plugin;

        let model: StateObjectSelector;

        if (params.model.kind === 'model-data' || params.model.kind === 'model-url') {
            const data = params.model.kind === 'model-data'
                ? await plugin.builders.data.rawData({ data: params.model.data, label: params.modelLabel })
                : await plugin.builders.data.download({ url: params.model.url, isBinary: params.model.isBinary, label: params.modelLabel });

            const trajectory = await plugin.builders.structure.parseTrajectory(data, params.model.format ?? 'mmcif');
            model = await plugin.builders.structure.createModel(trajectory);
        } else {
            const data = params.model.kind === 'topology-data'
                ? await plugin.builders.data.rawData({ data: params.model.data, label: params.modelLabel })
                : await plugin.builders.data.download({ url: params.model.url, isBinary: params.model.isBinary, label: params.modelLabel });

            const provider = plugin.dataFormats.get(params.model.format);
            model = await provider!.parse(plugin, data);
        }

        const data = params.coordinates.kind === 'coordinates-data'
            ? await plugin.builders.data.rawData({ data: params.coordinates.data, label: params.coordinatesLabel })
            : await plugin.builders.data.download({ url: params.coordinates.url, isBinary: params.coordinates.isBinary, label: params.coordinatesLabel });

        const provider = plugin.dataFormats.get(params.coordinates.format);
        const coords = await provider!.parse(plugin, data);

        const trajectory = await plugin.build().toRoot()
            .apply(TrajectoryFromModelAndCoordinates, {
                modelRef: model.ref,
                coordinatesRef: coords.ref
            }, { dependsOn: [model.ref, coords.ref] })
            .commit();

        const preset = await plugin.builders.structure.hierarchy.applyPreset(trajectory, params.preset ?? 'default');

        return { model, coords, preset };
    };

    handleResize() {
        this.plugin.layout.events.updated.next(void 0);
    }
  }
export interface LoadStructureOptions {
    representationParams?: StructureRepresentationPresetProvider.CommonParams
}

export interface VolumeIsovalueInfo {
    type: 'absolute' | 'relative',
    value: number,
    color: Color,
    alpha?: number,
    volumeIndex?: number
}

export interface LoadTrajectoryParams {
    model: { kind: 'model-url', url: string, format?: BuiltInTrajectoryFormat /* mmcif */, isBinary?: boolean }
    | { kind: 'model-data', data: string | number[] | ArrayBuffer | Uint8Array, format?: BuiltInTrajectoryFormat /* mmcif */ }
    | { kind: 'topology-url', url: string, format: BuiltInTopologyFormat, isBinary?: boolean }
    | { kind: 'topology-data', data: string | number[] | ArrayBuffer | Uint8Array, format: BuiltInTopologyFormat },
    modelLabel?: string,
    coordinates: { kind: 'coordinates-url', url: string, format: BuiltInCoordinatesFormat, isBinary?: boolean }
    | { kind: 'coordinates-data', data: string | number[] | ArrayBuffer | Uint8Array, format: BuiltInCoordinatesFormat },
    coordinatesLabel?: string,
    preset?: keyof PresetTrajectoryHierarchy
}

export const ViewerAutoPreset = StructureRepresentationPresetProvider({
    id: 'preset-structure-representation-viewer-auto',
    display: {
        name: 'Automatic (w/ Annotation)', group: 'Annotation',
        description: 'Show standard automatic representation but colored by quality assessment (if available in the model).'
    },
    isApplicable(a) {
        return (
            !!a.data.models.some(m => QualityAssessment.isApplicable(m, 'pLDDT')) ||
            !!a.data.models.some(m => QualityAssessment.isApplicable(m, 'qmean'))
        );
    },
    params: () => StructureRepresentationPresetProvider.CommonParams,
    async apply(ref, params, plugin) {
        const structureCell = StateObjectRef.resolveAndCheck(plugin.state.data, ref);
        const structure = structureCell?.obj?.data;
        if (!structureCell || !structure) return {};

        if (!!structure.models.some(m => QualityAssessment.isApplicable(m, 'pLDDT'))) {
            return await QualityAssessmentPLDDTPreset.apply(ref, params, plugin);
        } else if (!!structure.models.some(m => QualityAssessment.isApplicable(m, 'qmean'))) {
            return await QualityAssessmentQmeanPreset.apply(ref, params, plugin);
        } else if (!!structure.models.some(m => SbNcbrPartialChargesPropertyProvider.isApplicable(m))) {
            return await SbNcbrPartialChargesPreset.apply(ref, params, plugin);
        } else {
            return await PresetStructureRepresentations.auto.apply(ref, params, plugin);
        }
    }
});