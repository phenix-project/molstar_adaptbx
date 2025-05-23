import { Loci } from '../../mol-model/loci';
import { StructureElement } from '../../mol-model/structure';
import { clearStructureOverpaint } from '../../mol-plugin-state/helpers/structure-overpaint';
import { StructureQueryHelper } from '../../mol-plugin-state/helpers/structure-query';
import { StructureComponentManager } from '../../mol-plugin-state/manager/structure/component';
import { StateTransforms } from '../../mol-plugin-state/transforms';
import { PluginCommands } from '../../mol-plugin/commands';
import { Color } from '../../mol-util/color';
import { ParamDefinition } from '../../mol-util/param-definition';
import { PhenixViewer } from './app';
import { MolstarState } from './api';
import { getLocationArray, phenixSelFromLoci, TwoWayDictionary} from './helpers';
import {  PhenixReferenceClass, PhenixStructureClass, PhenixComponentClass, PhenixRepresentationClass} from './helpers';
import { StructureSelectionQuery } from '../../mol-plugin-state/helpers/structure-selection-query';


// @ts-ignore
export namespace Phenix {
    export function cameraMode(this: PhenixViewer) {
        if (this.isFocused) {
            return 'camera-target';
        } else {
            return 'auto';
        }
    }
    
    export function postInit(this: PhenixViewer) {
        // subscribe hover
        this.plugin.behaviors.interaction.hover.subscribe(ev => {
            if (StructureElement.Loci.is(ev.current.loci)) {
                // console.log('hover');
                const l = StructureElement.Loci.getFirstLocation(ev.current.loci);
                if (l) {
                    // Hover related logic...
                }
            }
        });

        // subscribe click
        this.plugin.behaviors.interaction.click.subscribe(ev => {
            if (StructureElement.Loci.is(ev.current.loci)) {
                console.log('click');
                const l = StructureElement.Loci.getFirstLocation(ev.current.loci);
                if (l) {
                    // Click related logic...
                    this.isFocused = true;
                }
            }
        });
    }

    export async function loadStructureFromPdbString(this: PhenixViewer, data: string, format: string, label: string, external_ref_id: string) {
        // V2 Function
        this.hasSynced = false;
        const _data = await this.plugin.builders.data.rawData({ data: data, label: label });
        // @ts-ignore
        const trajectory = await this.plugin.builders.structure.parseTrajectory(_data, format);
        await this.plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');

        await this.phenix.updateFromExternal(external_ref_id)
        this.plugin.managers.interactivity.setProps({granularity: 'element' }) // default select by atom
    }
    

    export async function updateFromExternal(this: PhenixViewer, external_ref_id: string) {
        // V2 Function
        // Manage reference ids
        console.log('Adding model with external refId: ', external_ref_id);
        const structures = this.plugin.managers.structure.hierarchy.current.structures;
      
        let newReferenceCount = 0;
        structures.forEach((structure) => {
      
          // References
          let phenixReference: PhenixReferenceClass;
          let phenixRefKey: string | undefined
          let molstarRefKey = structure.cell.transform.ref;
      
          if (external_ref_id !== undefined && !this.objectStorageMolstar.hasValue(molstarRefKey)) {
            // New Reference

            phenixRefKey = external_ref_id;
            phenixReference = new PhenixReferenceClass(phenixRefKey, molstarRefKey);

            console.log("New Reference.....",phenixRefKey,molstarRefKey)



            this.objectStorageMolstar.set(molstarRefKey, phenixReference);
            this.objectStoragePhenix.set(phenixRefKey, phenixReference);
      
            if (newReferenceCount === 0) {
              newReferenceCount++;
            } else {
              throw new Error('new reference count should be 0 to add a new reference');
            }
          } else {
            // Existing Reference
            phenixReference = this.objectStorageMolstar.getByKey(molstarRefKey)
            phenixRefKey = phenixReference.phenixKey
            if (!phenixRefKey) {
              throw new Error('refId not present in object storage');
            }
            // phenixReference = this.objectStoragePhenix.getByKey(phenixRefKey);
          }
      
          if (!this.phenixState.hasPhenixReferenceKey(phenixRefKey)) {
            this.phenixState.references.push(phenixReference);
          }
      
          // Structures
          let phenixStructure: PhenixStructureClass;
          let phenixStructureKey: string | undefined;
          let molstarStructureKey = (structure?.cell?.obj?.id as string)
          let molstarDataId =  structure?.model?.cell?.obj?.data?.id

        
          if (!this.objectStorageMolstar.hasKey(molstarStructureKey)) {
            // New structure
            phenixStructureKey = this.phenix.generateUniqueKey();
            if (!phenixStructureKey) {
              throw new Error('Failed to obtain a phenixStructureKey');
            }
  
            phenixStructure = new PhenixStructureClass(phenixRefKey, phenixStructureKey,molstarDataId, molstarStructureKey);
            
            console.log("New structure.....",phenixStructureKey,molstarStructureKey)
            
            this.objectStorageMolstar.set(molstarStructureKey, structure);
            this.objectStoragePhenix.set(phenixStructureKey, phenixStructure);
            this.keyMapPhenixToMolstar.set(phenixStructureKey,molstarStructureKey)
          } else {
            // Existing structure
            
            phenixStructureKey = this.keyMapPhenixToMolstar.getByValue(molstarStructureKey)
            if (!phenixStructureKey) {
              throw new Error('Failed to obtain a phenixStructureKey');
            }
            phenixStructure = this.objectStoragePhenix.getByKey(phenixStructureKey);
          }
      
          if (!phenixReference.hasPhenixStructureKey(phenixStructureKey)) {
            phenixReference.structures.push(phenixStructure);
          }
      
          // Components
          structure.components.forEach((component) => {

            let phenixComponent: PhenixComponentClass;
            let phenixComponentKey: string | undefined;
            let molstarComponentKey = (component?.cell?.obj?.id as string)
      
            if (!this.objectStorageMolstar.hasKey(molstarComponentKey)) {

              phenixComponentKey = this.phenix.generateUniqueKey();
              if (!phenixComponentKey) {
                throw new Error('Failed to obtain a phenixComponentKey');
              }
              phenixComponent = new PhenixComponentClass(phenixComponentKey,molstarComponentKey);
              phenixComponent.key = component.key ?? "";
      
              // New Component
              console.log("New component...",phenixComponentKey,phenixComponent.key)

              this.objectStorageMolstar.set(molstarComponentKey, component);
              this.objectStoragePhenix.set(phenixComponentKey, phenixComponent);
              this.keyMapPhenixToMolstar.set(phenixComponentKey,molstarComponentKey)
            } else {
              // Existing component
              phenixComponentKey = this.keyMapPhenixToMolstar.getByValue(molstarComponentKey)
              if (!phenixComponentKey) {
                throw new Error('Failed to obtain a phenixComponentKey');
              }
              phenixComponent = this.objectStoragePhenix.getByKey(phenixComponentKey);
            }
      
            if (!phenixStructure.hasPhenixComponentKey(phenixComponentKey)) {
              phenixStructure.components.push(phenixComponent);
            }
      
            // Representations
            component.representations.forEach((representation) => {
              let phenixRepresentation: PhenixRepresentationClass;
              let phenixRepresentationKey: string | undefined;
              let molstarRepresentationKey = (representation?.cell?.obj?.id as string)
              let rep_name = representation.cell?.params?.values?.type?.name ?? "";
              // let molstarRepresentationKey = molstarComponentKey + "_"+ rep_name
      
              if (!this.objectStorageMolstar.hasKey(molstarRepresentationKey)) {
                // New Representation

                phenixRepresentationKey = this.phenix.generateUniqueKey();
                if (!phenixRepresentationKey) {
                  throw new Error('Failed to obtain a phenixRepresentationKey');
                }
                phenixRepresentation = new PhenixRepresentationClass(phenixRepresentationKey,molstarRepresentationKey);
                phenixRepresentation.name = rep_name
      
                console.log("New representation...")
                console.log("  molstarRepresentationKey",molstarRepresentationKey)
                console.log("  phenixRepresentationKey",phenixRepresentationKey)
                console.log("  phenixRepresentation.name",phenixRepresentation.name)

                this.objectStorageMolstar.set(molstarRepresentationKey, representation);
                this.objectStoragePhenix.set(phenixRepresentationKey, phenixRepresentation);
                this.keyMapPhenixToMolstar.set(phenixRepresentationKey,molstarRepresentationKey)
              } else {
                // Existing representation
                phenixRepresentationKey = this.keyMapPhenixToMolstar.getByValue(molstarRepresentationKey)
                if (!phenixRepresentationKey) {
                  throw new Error('Failed to obtain a phenixComponentKey');
                }
                phenixRepresentation = this.objectStoragePhenix.getByKey(phenixRepresentationKey);

                // reset the representation object even if not new
                this.objectStorageMolstar.set(molstarRepresentationKey, representation);
              }
      
              if (!phenixComponent.hasPhenixRepresentationKey(phenixRepresentationKey)) {
                phenixComponent.representations.push(phenixRepresentation);
              }
            });
          });
        });
        this.phenixState.has_synced = true;
      }
      

    export function generateUniqueKey(this: PhenixViewer, length: number = 16): string {
        // Define a string with all possible characters for the key
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        // Append the current timestamp to the result
        result += Date.now().toString(36); // Convert the timestamp to a base-36 string
      
        // Fill the remaining length with random characters
        const remainingLength = length - result.length;
        for (let i = 0; i < remainingLength; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          result += characters.charAt(randomIndex);
        }
      
        return result;
      }

    export function pollStructures(this: PhenixViewer) {

        const refs: string[] = [];
        const structures = this.plugin.managers.structure.hierarchy.current.structures;
        structures.forEach((structure) => {
            const ref = structure.cell.transform.ref;
            if (ref) {
                refs.push(ref);
            }
        });
        return JSON.stringify(refs);
    }

    export function setState(this: PhenixViewer) {
        this.phenixState.has_synced = true
    }

    export function queryFromExpression(this:PhenixViewer,selection_expression: any){
        const selectionQuery = StructureSelectionQuery('Phenix Query',selection_expression)
        return selectionQuery
        //this.currentSelExpression = selectionQuery.expression
        //this.phenix.selectFromQuery(selectionQuery)
    }

    export function selectFromSel(this:PhenixViewer,sel:any,focus:boolean=true){
        const selectionQuery = StructureSelectionQuery('Custom Query',sel)
        this.currentSelExpression = selectionQuery.expression
        this.phenix.selectFromQuery(selectionQuery,focus)
    }

    export function selectFromQuery(this: PhenixViewer, selectionQuery: any, focus: boolean = true) {
        // V2 Function
        this.currentSelExpression = selectionQuery.expression;
        this.plugin.managers.structure.selection.fromSelectionQuery("set",selectionQuery,false)


        const loci = this.phenix.getSelectedLoci();
        // if empty, stop
        if (Loci.isEmpty(loci)) {
            return;
        }

        // set default selection color (can remove?)
        //this.phenix.setColor({ select: { r: 255, g: 112, b: 3 }, highlight: { r: 255, g: 112, b: 3 } });

        // apply selection
        this.plugin.managers.interactivity.lociSelects.selectOnly({ loci });

        // focus loci
        if (focus === true) {
            this.plugin.managers.camera.focusLoci(loci);
        }
    }
    export function focusSelected(this: PhenixViewer){
        const loci = this.phenix.getSelectedLoci();
        // if empty, stop
        if (Loci.isEmpty(loci)) {
            return;
        }

        // set default selection color (can remove?)
        //this.phenix.setColor({ select: { r: 255, g: 112, b: 3 }, highlight: { r: 255, g: 112, b: 3 } });

        // apply selection
        this.plugin.managers.interactivity.lociSelects.selectOnly({ loci });

        // focus loci
        this.plugin.managers.camera.focusLoci(loci);
    }


    export function pollSelection(this: PhenixViewer) {
        // V2 Function
        const loci = this.phenix.getSelectedLoci();
        //const query = this.phenix.getQueryFromLoci(loci);
        const phenixSel = phenixSelFromLoci(loci)
        return phenixSel
    }
    
    export function setColor(this: PhenixViewer, param: { highlight?: any, select?: any }) {

        const renderer = this?.plugin?.canvas3d?.props.renderer;
        const rParam= {};

        if (param.highlight) {
            // @ts-ignore
            rParam['highlightColor'] = this.phenix.normalizeColor(param.highlight);
        }

        if (param.select) {
            // @ts-ignore
            rParam['selectColor'] = this.phenix.normalizeColor(param.select);
        }

        PluginCommands.Canvas3D.SetSettings(this.plugin, {
            settings: {
                // @ts-ignore
                renderer: {
                    ...renderer,
                    ...rParam
                }
            }
        });
        // @ts-ignore

        if (rParam.highlightColor) {
            this.isHighlightColorUpdated = true;
        }
    }
    export function normalizeColor(colorVal: any, defaultColor?: Color) {
        let color = Color.fromRgb(170, 170, 170);
        try {
            if (typeof colorVal.r !== 'undefined') {
                color = Color.fromRgb(colorVal.r, colorVal.g, colorVal.b);
            } else if (colorVal[0] === '#') {
                color = Color(Number(`0x${colorVal.substr(1)}`));
            } else {
                color = Color(colorVal);
            }
        } catch (e) {
            if (defaultColor) color = defaultColor;
        }
        return color;
    }

    export async function clearSelection(this: PhenixViewer) {
        this.plugin.managers.interactivity.lociSelects.deselectAll();
        // reset theme to default
        // if (this.selectedParams && this.selectedParams.nonSelectedColor) {
        //   this.visual.reset({ theme: true });
        // }
        // remove overpaints
        await clearStructureOverpaint(this.plugin, this.plugin.managers.structure.hierarchy.current.structures[0].components);

        // remove selection representations
        if (this.selectedParams && this.selectedParams.addedRepr) {
            const selReprCells: any = [];
            for (const s of this.plugin.managers.structure.hierarchy.current.structures) {
                for (const c of s.components) {
                    if (c.cell && c.cell.params && c.cell.params.values && c.cell.params.values.label === 'selection-by-script') {
                        selReprCells.push(c.cell);
                    }
                }
            }
            if (selReprCells.length > 0) {
                for await (const selReprCell of selReprCells) {
                    await PluginCommands.State.RemoveObject(this.plugin, { state: selReprCell.parent!, ref: selReprCell.transform.ref });
                }
            }
        }
        this.selectedParams = undefined;
    }

    export function clearAll(this: PhenixViewer) {
        // this.clearSelection();
        this.plugin.clear();
        this.plugin.build();
        this.objectStorageMolstar = new TwoWayDictionary();
        this.objectStoragePhenix = new TwoWayDictionary();
        this.phenixState = new MolstarState();
        this.hasSynced = true;
        // this.hasVolumes = false;
    }
    export function queryAll(this:PhenixViewer){
        const queryAll = StructureSelectionQuery('All', this.MS.struct.generator.all(), { category: '', priority: 1000 }); 
        return queryAll
    }

    
    export function selectAll(this:PhenixViewer){
        const queryAll = this.phenix.queryAll()
        this.phenix.selectFromQuery(queryAll)
    }
    export async function deselectAll(this: PhenixViewer) {
        // V2 Function
        this.plugin.managers.interactivity.lociSelects.deselectAll();
    }

    export function debugQuery(this: PhenixViewer){
        const MS = this.MS
        const sel = MS.struct.generator.atomGroups({
                  'atom-test': MS.core.rel.eq([MS.ammp('label_comp_id'), 'LEU'])})
        const selectionQuery = StructureSelectionQuery('Custom Query',sel)
        return selectionQuery
    }

    export function getThemeParams(this: PhenixViewer) {
        const themeParams = StructureComponentManager.getThemeParams(this.plugin, this.plugin.managers.structure.component.pivotStructure);
        const theme = ParamDefinition.getDefaultValues(themeParams);

        // color
        theme.action.name = 'color';
        theme.action.params = { color: Color.fromRgb(255, 112, 3), opacity: 1 };

        // transparency
        // theme.action.name = 'transparency'
        // theme.action.params = { value: 1.0 };
        return theme;
    }
    export async function addRepresentationSelected(this: PhenixViewer,reprName: string) {
        // const phenixRepresentationKey = this.phenix.generateUniqueKey();
        // const phenixRepresentationObj = new PhenixRepresentationClass(phenixRepresentationKey,reprName);
        // this.objectStoragePhenix.set(phenixRepresentationKey,phenixRepresentationObj)
        //const component = this.objectStorageMolstar.getByKey(phenixComponentObj.molstarKey)
        
        const loci = this.phenix.getSelectedLoci()
        if (Loci.isEmpty(loci)) return;

        // this.plugin.managers.interactivity.lociSelects.selectOnly({ loci });
        const defaultParams = StructureComponentManager.getAddParams(this.plugin, { allowNone: false, hideSelection: true, checkExisting: true });
        const defaultValues = ParamDefinition.getDefaultValues(defaultParams);
        defaultValues.options = { label: 'selection-by-script', checkExisting: true };
        const values = { ...defaultValues, ...{ representation: reprName } };
        const structures = this.plugin.managers.structure.hierarchy.getStructuresWithSelection();
        await this.plugin.managers.structure.component.add(values, structures);
        //this.plugin.managers.camera.reset();

        // phenixComponentObj.representations.push(phenixRepresentationObj)
        this.phenix.updateFromExternal(undefined)


    }
    export function checkSingleEntry<K, V>(map: Map<K, V>): { key: K; value: V } | never {
        // V2 Function
        if (map.size === 1) {
            const entry = map.entries().next().value;
            const [key, value] = entry;
            return { key, value };
        } else if (map.size > 1) {
            console.log('map object contents:');
            map.forEach((value, key) => {
                console.log(`Key: ${key}, Value: ${value}`);
            });
            throw new Error('The map has more than one entry.',);
        } else {
            throw new Error('The map is empty.');
        }
    }
    export function getSel(this: PhenixViewer) {
        // V2 Function
        // @ts-ignore
        return this.plugin.managers.interactivity.lociSelects.sel;
    }

    export function getSelectedLoci(this: PhenixViewer): Loci {
        // V2 Function
        const entry_map = this.phenix.getSel().entries;
        const result = this.phenix.checkSingleEntry(entry_map);
        const loci = result.value.selection;
        return loci;
    }
    export function getSelectedStructure(this:PhenixViewer): any {
        const structures = this.plugin.managers.structure.hierarchy.getStructuresWithSelection();
        if (structures.length > 1) {
            throw new Error('More than one selected structure.',);
        } 
        return structures[0]
        
    }
 
    export function getLocations(this: PhenixViewer, loci: Loci) {
        return getLocationArray(loci);
    }

    export function getLociStats(this: PhenixViewer, loci: Loci) {
        // @ts-ignore
        return StructureElement.Stats.ofLoci(loci);
    }
    export async function colorSelection(this: PhenixViewer, query: StructureSelectionQuery, R: number, G: number, B: number) {
        
        this.phenix.selectFromQuery(query)
        const loci = this.phenix.getSelectedLoci()
        const structure = this.phenix.getSelectedStructure()
        

        this.plugin.managers.interactivity.lociSelects.selectOnly({ loci });
        const themeParams = StructureComponentManager.getThemeParams(this.plugin, structure);
        const themeValues = ParamDefinition.getDefaultValues(themeParams);
        themeValues.action.name = 'color';
        themeValues.action.params = { color: Color.fromRgb(R,G,B), opacity: 1 };
        await this.plugin.managers.structure.component.applyTheme(themeValues, [structure]);
        this.plugin.managers.interactivity.lociSelects.selectOnly({ loci });

    }
      

    export function getStructureForRef(this:PhenixViewer, phenixRefId: string){
        const refObj = this.objectStoragePhenix.getByKey(phenixRefId);
        const structureKey = refObj.getStructureKey()
        const structure = this.objectStorageMolstar.getByKey(structureKey)
        return structure
    }


    export async function setTransparencyQuery(this: PhenixViewer, query: StructureSelectionQuery, component_name: string | undefined, representation_name: string | undefined, value: number) {
        // reference: https://github.com/molstar/molstar/issues/149
        // var selectionQuery = this.phenix.queryCurrent()
        // this.phenix.selectFromQuery(selectionQuery)
        var currentSelExpression = query.expression
        this.phenix.selectFromQuery(query)
        const structure = this.phenix.getSelectedStructure();
        const molstarKey = structure.cell.obj.id;
        const phenixStructureKey = this.keyMapPhenixToMolstar.getByValue(molstarKey)
        const phenixStructureObj = this.objectStoragePhenix.getByKey((phenixStructureKey as string))
        console.log("Adjusting transparency for Structure with:")
        console.log(`  molstarKey: ${molstarKey}`)
        console.log(`  phenixKey: ${phenixStructureObj.phenixKey}`)
        //const phenixStructureKey = phenixStructure.phenixKey;
        // @ts-ignore
        //const phenixStructureObj = this.objectStoragePhenix.getByKey(phenixStructureKey);
        const phenixComponentObjs = phenixStructureObj.components;
      
        phenixComponentObjs.forEach((phenixComponentObj: any) => {
        console.log("    Component:")
        console.log(`      molstarKey: ${phenixComponentObj.molstarKey}`)
        console.log(`      phenixKey: ${phenixComponentObj.phenixKey}`)
        console.log(`      name: ${phenixComponentObj.key}`)
          const comp_name = phenixComponentObj.key;
          if((!component_name) || (comp_name === component_name)) {
            // Component argument exists in this obj
            let repr_present = false;
            phenixComponentObj.representations.forEach((phenixRepresentationObj: any) => {
            console.log("      Representation:")
            console.log(`        molstarKey: ${phenixRepresentationObj.molstarKey}`)
            console.log(`        phenixKey: ${phenixRepresentationObj.phenixKey}`)
            console.log(`        name: ${phenixRepresentationObj.name}`)
            if ((!representation_name) || (phenixRepresentationObj.name === representation_name)) {
                if (phenixRepresentationObj.name === representation_name){
                console.log(`Representation name ${representation_name} exists in component. Able to change transparency`);
                repr_present = true;
                } else {
                console.log(`Representation name ${representation_name} is undefined, will try to change transparency of  ${phenixRepresentationObj.name}`);
                repr_present = true;
                }
                
            } else{
                repr_present = false;
            }
            if (!repr_present){

                // either need to add or ignore this representation

                if (value===0.0) {
                    // Representation name did not exist, need to add
                    // Do something
                    console.log(`Representation name ${representation_name} does not exist in component ${comp_name}. Will try to add...`);
                    // You can add code here to handle adding the representation if needed
                    this.phenix.addRepresentationSelected(representation_name)
                }else {
                    console.log(`Representation name ${representation_name} does not exist in component ${comp_name}. Will not change transparency, will not try to add.`);
                }
            } else {
    
                // Representation name exists in this object
                // set transparency
                const representation = this.objectStorageMolstar.getByKey(phenixRepresentationObj.molstarKey)
                const repr = representation.cell;
                //const loci = this.phenix.getSelectedLoci()
                //const data = (loci.obj as PluginStateObject.Molecule.Structure).data;
    
                // @ts-ignore
                const { selection } = StructureQueryHelper.createAndRun(structure.cell.obj.data.root, currentSelExpression);
                const bundle = StructureElement.Bundle.fromSelection(selection);
    
                const update = this.plugin.build();
                console.log("Changing transparency of:")
                console.log("  phenixComponentObj.key",phenixComponentObj.key)
                //console.log("  phenixRepresentationObj.molstarKey",phenixRepresentationObj.molstarKey)
                console.log("  phenixRepresentationObj.name",phenixRepresentationObj.name)

                // if you have more than one repr to apply this to, do this for each of them
                update.to(repr).apply(StateTransforms.Representation.TransparencyStructureRepresentation3DFromBundle, {
                    layers: [{ bundle, value: value }]
                });
                //this.phenix.setColor({ select: { r: 255, g: 255, b: 255 }, highlight: { r: 255, g: 255, b: 255 } });
                return update.commit();
                
            }
            });
          }
        });
      }


    export function toggleSelectionMode(this: PhenixViewer, isVisible: boolean) {
        if (!isVisible) {
            // console.log('Clearing selection');
            this.plugin.managers.interactivity.lociSelects.deselectAll();
            this.phenix.clearSelection();
        }
        this.plugin.behaviors.interaction.selectionMode.next(isVisible);
    }
}