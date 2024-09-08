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
    throw new Error("Override the run method in a subclass");
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

// export class Response extends ApiClass {
//   json: string

// constructor(json: string = '') {
//   super("Response");
//   this.json = json;
// }
// }

// Request class
// @ts-ignore
export class Request extends ApiClass {
  name: string;
  data: ApiClass;

  constructor(data: ApiClass) {
    super("Request");
    this.name = data.constructor.name; // Automatically set the name from the data class
    this.data = data;
  }

  toDict(): Record<string, any> {
    return {
      name: this.data.className, // Include the data class name
      data: this.data.toDict(),
    };
  }

  static fromDict(data: any): Request {
    const classMap = {
      'RawJS': RawJS,  // Explicitly map class names to constructors
      'Request': Request,
      'MolstarState':MolstarState,
      'SelectionPoll':SelectionPoll,
    };
    // @ts-ignore
    const dataClass = classMap[data.name];
    if (!dataClass) {
      throw new Error(`Unknown data class: ${data.name}`);
    }

    const dataInstance = dataClass.fromDict(data.data);
    return new Request(dataInstance);
  }
}

// RawJS class for handling raw JavaScript evaluation
export class RawJS extends ApiClass {
  js: string;

  constructor(js: string = '') {
    super("RawJS");
    this.js = js;
  }

  run(viewer: PhenixViewer) {
    const func = new Function('viewer', this.js);
    return func(viewer)
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
    return viewer.phenixState.toJSON()
  }
}


export class SelectionPoll extends ApiClass {

  constructor(){
    super("SelectionPoll");
  }
  run(viewer: PhenixViewer) {
    const json_result = viewer.phenix.pollSelection()
    return json_result
  }
}

