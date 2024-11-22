/*
 * TypeScript definition of Api-classes. This defines a stable interface
 * to interact with the Molstar web app from the Phenix python environment.
 * 
 * Each class defined here should have a corresponding class in api.py. The
 * classes should be interchangeable via json text.
 *
 * Data is loaded in Python, and then the run() method is called inside the js
 * vm, giving each class access to the PhenixViewer object.
 * 
 */

import { PhenixViewer } from './app';
import { PhenixReference } from './helpers';

// Base class for handling JSON serialization and deserialization
export class ApiClass {
  className: string;

  constructor(className?: string) {
    this.className = className || this.constructor.name;
  }

  run(viewer: PhenixViewer) {
    // Here go the operations associated with each Api subclass
    //throw new Error("Override the run method in a subclass");
    return
  }

  toJSON(): string {
    return JSON.stringify(this.toDict(), null, 2);
  }

  toDict(): Record<string, any> {
    return { ...this, className: this.className }; // Include the class name in the serialized object
  }

  static fromJSON<T extends ApiClass>(this: new (...args: any[]) => T, json: string): T {
    const data = JSON.parse(json);
    // @ts-ignore
    return this.fromDict(data);
  }

  static fromDict<T extends ApiClass>(this: new (...args: any[]) => T, data: any): T {
    const instance = new this();
    Object.assign(instance, data);
    return instance;
  }
}

// ApiRequest class
// @ts-ignore
export class ApiRequest extends ApiClass {
  name: string;
  data: ApiClass;

  constructor(data: ApiClass) {
    super("ApiRequest");
    this.name = data.constructor.name; // Automatically set the name from the data class
    this.data = data;
  }

  toDict(): Record<string, any> {
    return {
      name: this.data.className, // Include the data class name
      data: this.data.toDict(),
    };
  }

  static fromDict(data: any): ApiRequest {
    // The classMap maps a subclass name (present in the function input)
    //  to the actual class, to the actual class definition. 
    // 
    // Doing this manually is not ideal, minification seems to cause issues
    //  when doing it dynamically.
    const classMap = {
      'RawJS': RawJS,
      'RawJSAsync': RawJSAsync,
      'ApiRequest': ApiRequest,
      'MolstarState': MolstarState,
      'SelectionPoll': SelectionPoll,
      'MakeSelection': MakeSelection,
      'LoadModel': LoadModel,
      'ClearViewer': ClearViewer,
      'ResetView': ResetView,
      'Focus': Focus,
      'ToggleSelectionMode': ToggleSelectionMode,
      'SetPickingGranularity': SetPickingGranularity,
      'AddRepresentation': AddRepresentation,
      'SetColor': SetColor
    };
    // @ts-ignore
    const dataClass = classMap[data.name];
    if (!dataClass) {
      throw new Error(`Unknown ts data class: ${data.name}`);
    }

    const dataInstance = dataClass.fromDict(data.data);
    return new ApiRequest(dataInstance);
  }
}

// RawJS class for handling raw JavaScript evaluation
export class RawJS extends ApiClass {
  js: string;
  result: string; // json result

  constructor(js: string = '') {
    super("RawJS");
    this.js = js;
  }

  run(viewer: PhenixViewer) {
    const func = new Function('viewer', this.js);
    const result = func(viewer);
  
    if (typeof result !== 'string') {
      return JSON.stringify(result);
    }
  
    return result;
  }
}

export class RawJSAsync extends ApiClass {
  js: string;
  result: string;

  constructor(js: string = '') {
    super("RawJSAsync");
    this.js = js;
  }

  async run(viewer: PhenixViewer): Promise<any> {
    const asyncFunc = new Function('viewer', `return (async () => { ${this.js} })();`);
    const result = await asyncFunc(viewer);
    
    if (typeof result !== 'string') {
      return JSON.stringify(result);
    }
    return result;
  }
}

// State class for defining/communicating internal state
export class MolstarState extends ApiClass {
  connection_id: string | undefined = undefined;
  has_synced: boolean = false;
  references: PhenixReference[] = []

  constructor(has_synced: boolean = false, references: PhenixReference[] = []) {
    super("MolstarState");
    this.has_synced = has_synced
    this.references = references
  }
  hasPhenixReferenceKey(phenixReferenceKey: string): boolean {
    for (const reference of this.references) {
      if (reference.phenixKey === phenixReferenceKey) {
        return true;
      }
    }
    return false;
  }

  run(viewer: PhenixViewer) {
    // If we can set connection_id and return the value, 
    //   then the molstar web app is sufficiently set up
    viewer.phenixState.connection_id = this.connection_id
    this.has_synced = viewer.phenixState.has_synced;
    this.references = viewer.phenixState.references;
    
  }
}


export class SelectionPoll extends ApiClass {
  atom_records: string; // json formatted atom records

  constructor(){
    super("SelectionPoll");
  }
  run(viewer: PhenixViewer) {
    const json_result = viewer.phenix.pollSelection()
    this.atom_records = json_result
  }
}

export class MakeSelection extends ApiClass {
  pymol_sel: string;
  focus: boolean = true;

  constructor(pymol_sel: string = '') {
    super("MakeSelection");
    this.pymol_sel = pymol_sel;
  }

  run(viewer: PhenixViewer) {
    const exp = viewer.parse("pymol", this.pymol_sel)  
    viewer.phenix.selectFromSel(exp,this.focus);
}
}

export class LoadModel extends ApiClass {
  pdb_str: string; // Text of model in pdb format
  ref_id: string; // Application-wide identifier

  constructor(ref_id: string = 'default_ref',pdb_str: string = '') {
    super("LoadModel");
    this.ref_id = ref_id;
    this.pdb_str = pdb_str;
  }

  run(viewer: PhenixViewer) {
    console.log("Running load model in js")
    viewer.phenix.loadStructureFromPdbString(this.pdb_str,'pdb', 'model', this.ref_id);
  }
}

// Add all the new classes
export class ClearViewer extends ApiClass {
  constructor() {
    super("ClearViewer");
  }

  run(viewer: PhenixViewer) {
    viewer.plugin.clear();
  }
}

export class ResetView extends ApiClass {
  constructor() {
    super("ResetView");
  }

  run(viewer: PhenixViewer) {
    viewer.plugin.managers.camera.reset()
  }
}

export class Focus extends ApiClass {

  constructor() {
      super("Focus");
  }

  run(viewer: PhenixViewer) {
      // Then focus on it
      viewer.phenix.focusSelected();
  }
}

export class ToggleSelectionMode extends ApiClass {
  is_selecting: boolean;

  constructor(is_selecting: boolean = false) {
    super("ToggleSelectionMode");
    this.is_selecting = is_selecting;
  }

  run(viewer: PhenixViewer) {
    viewer.phenix.toggleSelectionMode(this.is_selecting)
  }
}

export class SetPickingGranularity extends ApiClass {
  granularity: 'element' | 'residue';

  constructor(granularity: 'element' | 'residue') {
    super("SetPickingGranularity");
    this.granularity= granularity
  }

  run(viewer: PhenixViewer) {
    viewer.plugin.managers.interactivity.setProps({ granularity: this.granularity})
  }
}

export class AddRepresentation extends ApiClass {
  representation: 'cartoon' | 'ball-and-stick';

  constructor(representation: 'cartoon' | 'ball-and-stick') {
    super("AddRepresentation");
    this.representation = representation;
  }

  run(viewer: PhenixViewer) {
    viewer.phenix.addRepresentationSelected(this.representation)
  }
}

export class SetColor extends ApiClass {
  R: number
  G: number
  B: number

  constructor(R:number,G:number,B:number) {
    super("SetColor");
    this.R = R
    this.G = G
    this.B = B
  }

  run(viewer: PhenixViewer) {
    console.log("setting colors to: ",this.R,this.G,this.B)
    viewer.phenix.colorSelection(this.R, this.G, this.B)
  }
}
