"""
Python definitions of 'Api classes', which are json-serializable containers for 
making API calls. Each class defined here should have an identically names class
defined in api.ts, which is the typescript counterpart. The program flow is:
  
  1. An ApiClass object is instantiated in Python with necessary data
  2. The ApiClass is serialized into json, and packaged into a request
  3. The request is sent to the javascript server
  4. The ApiClass is de-serialized into the corresponding native js object
  5. The ApiClass executes the method corresponding to the api endpoint it was sent to
     ie. /run call this.run(), (the only one currently implemented)
  6. The return value of the method is serialized to json and sent back to Python
  7. The json response is interpreted on the Python side.
"""
import json
from dataclasses import dataclass, asdict, fields, is_dataclass
from typing import List, Dict, Optional, Literal
import matplotlib.colors as mcolors

#################################################################
# Base class and 'ApiRequest' class                                #
#################################################################

class ApiClass:
  """ Base class for all API classes """
  
  def to_dict(self) -> dict:
    """ Recursively convert dataclass to dict. """
    return asdict(self)

  def to_json(self) -> str:
    """Convert the object to a JSON string."""
    data_dict = self.to_dict()
    return json.dumps(data_dict, indent=2)

  @classmethod
  def from_dict(cls, data: dict):
    """Recursively instantiate dataclass from dict."""
    init_args = {}
    
    for field in fields(cls):
      field_value = data.get(field.name)

      if is_dataclass(field.type) and isinstance(field_value, dict):
        init_args[field.name] = field.type.from_dict(field_value)
      elif isinstance(field_value, list) and is_dataclass(field.type.__args__[0]):
        init_args[field.name] = [field.type.__args__[0].from_dict(item) for item in field_value]
      else:
        init_args[field.name] = field_value
    
    return cls(**init_args)

  @classmethod
  def from_json(cls, json_str: str):
    """Convert JSON string to ApiClass object."""
    data_dict = json.loads(json_str)
    assert isinstance(data_dict,dict), f"The result of json.loads(json_str) is type: {type(data_dict)}"
    return cls.from_dict(data_dict)

  @classmethod
  def from_response(cls,response):
    d = response.json()
    if isinstance(d,dict) and  "responses" in d and isinstance(d["responses"],list):
      if isinstance(d["responses"][0],dict) and "output" in d["responses"][0]:
        return cls.from_json(json.loads(d["responses"][0]["output"]))


#################################################################
# Classes implementing Api calls                                #
#################################################################


@dataclass
class RawJS(ApiClass):
  js: str  # Raw JavaScript to evaluate
  

@dataclass
class RawJSAsync(ApiClass):
  js: str  # Raw JavaScript to evaluate asynchronously

@dataclass
class SelectionPoll(ApiClass):
  # Returns what is selected as a list of atom records (one dict per atom)
  pass

@dataclass
class MakeSelection(ApiClass):
  pymol_sel: str
  focus: bool

@dataclass
class LoadModel(ApiClass):
  ref_id: str
  pdb_str: str

@dataclass
class ClearViewer(ApiClass):
  pass

@dataclass
class ResetView(ApiClass):
  pass

@dataclass
class Focus(ApiClass):
  pass


@dataclass
class ToggleSelectionMode(ApiClass):
  is_selecting: bool

@dataclass
class SetPickingGranularity(ApiClass):
  granularity: Literal['element','residue']

@dataclass
class AddRepresentation(ApiClass):
  representation: Literal['cartoon','ball-and-stick']


@dataclass
class SetColor(ApiClass):
  color_string: Optional[str] = 'red'
  R: Optional[int] = None
  G: Optional[int] = None
  B: Optional[int] = None

  def __post_init__(self):
    color = self.color_string
    if color in mcolors.CSS4_COLORS:
      rgb = mcolors.to_rgb(mcolors.CSS4_COLORS[color])
    elif color.startswith('#'):
      rgb = mcolors.to_rgb(color)
    else:
      raise ValueError("Unknown named color or invalid hex code")
    rgb = tuple(e*255 for e in rgb)
    self.R, self.G, self.B = rgb



#Specialized ApiRequest class that handles dynamic 'data' field

@dataclass
class ApiRequest(ApiClass):
  name: str  # Holds the class name of the data field
  data: ApiClass  # Holds an instance of another ApiClass subclass

  def __init__(self, data: ApiClass):
    """Automatically populate 'name' from the class of 'data'."""
    self.data = data
    self.name = data.__class__.__name__  # Automatically set the name based on data's class

  def to_json(self) -> str:
    """Convert ApiRequest to JSON and use the class name of 'data' for 'name'."""
    data_dict = self.to_dict()
    data_dict['name'] = self.data.__class__.__name__  # Set the 'name' field to class name of 'data'
    data_dict['data'] = self.data.to_dict()  # Convert 'data' to dict
    return json.dumps(data_dict, indent=2)

  
  @classmethod
  def from_json(cls, json_str: str):
    """Convert JSON back to ApiRequest and resolve 'data' based on 'name'."""
    data_dict = json.loads(json_str)
    return cls.from_dict(data_dict)

  @classmethod
  def from_dict(cls,data_dict:dict):

    # Dynamically resolve the correct class for 'data'
    data_class = globals().get(data_dict['name'])  # Assuming all classes are in global scope
    if not data_class or not issubclass(data_class, ApiClass):
      raise ValueError(f"Unknown data class in Python: {data_dict['name']}")

    # Deserialize 'data' as the resolved class
    data_obj = data_class.from_dict(data_dict['data'])
    
    # Create ApiRequest instance
    return cls(data=data_obj)

#################################################################
# Api objects for representing Molstar internal state in Python #
#################################################################

@dataclass
class Component(ApiClass):
  phenixKey: str
  key: str
  representations: List[str]

@dataclass
class Representation(ApiClass):
  phenixKey: str
  name: str

@dataclass
class Structure(ApiClass):
  phenixReferenceKey: str
  phenixKey: str
  data_id: str
  key: str
  components: List[Component]


@dataclass
class Reference(ApiClass):
  id_viewer: Optional[str]
  id_molstar: Optional[str]
  structures: List[Structure]

  @classmethod
  def from_default(cls):
    return cls(
      id_viewer = None,
      id_molstar = None,
      structure = None
    )

  @property
  def representations(self):
    output = []
    for structure in self.structures:
      for component in structure.components:
        for repr_name in component.representations:
          output.append(repr_name)
    return output

@dataclass
class Component(ApiClass):
  phenixKey: str
  key: str
  representations: List[str]


@dataclass
class Representation(ApiClass):
  phenixKey: str
  name: str

@dataclass
class Structure(ApiClass):
  phenixReferenceKey: str
  phenixKey: str
  data_id: str
  key: str
  components: List[Component]

@dataclass
class Reference(ApiClass):
  id_viewer: Optional[str]
  id_molstar: Optional[str]
  structures: List[Structure]

@dataclass
class MolstarState(ApiClass):
  connection_id: str # A unique id for each adapter connection
  has_synced: bool
  references: List[Reference]

  @classmethod
  def from_empty(cls,connection_id=""):
    return cls(references=[],has_synced=False,connection_id=connection_id)