import json
from dataclasses import dataclass, asdict, fields, is_dataclass
from typing import List, Dict, Optional

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

# Specialized Request class that handles dynamic 'data' field
@dataclass
class Request(ApiClass):
  name: str  # Holds the class name of the data field
  data: ApiClass  # Holds an instance of another ApiClass subclass

  def __init__(self, data: ApiClass):
    """Automatically populate 'name' from the class of 'data'."""
    self.data = data
    self.name = data.__class__.__name__  # Automatically set the name based on data's class

  def to_json(self) -> str:
    """Convert Request to JSON and use the class name of 'data' for 'name'."""
    data_dict = self.to_dict()
    data_dict['name'] = self.data.__class__.__name__  # Set the 'name' field to class name of 'data'
    data_dict['data'] = self.data.to_dict()  # Convert 'data' to dict
    return json.dumps(data_dict, indent=2)

  @classmethod
  def from_json(cls, json_str: str):
    """Convert JSON back to Request and resolve 'data' based on 'name'."""
    data_dict = json.loads(json_str)

    # Dynamically resolve the correct class for 'data'
    data_class = globals().get(data_dict['name'])  # Assuming all classes are in global scope
    if not data_class or not issubclass(data_class, ApiClass):
      raise ValueError(f"Unknown data class: {data_dict['name']}")

    # Deserialize 'data' as the resolved class
    data_obj = data_class.from_dict(data_dict['data'])
    
    # Create Request instance
    return cls(data=data_obj)

# @dataclass
# class Response:
#   json: str

# Example subclass of ApiClass
@dataclass
class RawJS(ApiClass):
  js: str  # Raw JavaScript to evaluate

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

  # @classmethod
  # def from_default(cls):
  #   return cls(
  #     id_viewer = None,
  #     id_molstar = None,
  #     structure = None
  #   )

  # @property
  # def representations(self):
  #   output = []
  #   for structure in self.structures:
  #     for component in structure.components:
  #       for repr_name in component.representations:
  #         output.append(repr_name)
  #   return output


@dataclass
class MolstarState(ApiClass):
  has_synced: bool
  references: List[Reference]

  @classmethod
  def from_empty(cls):
    return cls(references="ref placeholder",has_synced=False)

  # @classmethod
  # def from_dict_old(cls,state_dict):
  #   has_synced = state_dict["has_synced"]
  #   phenix_state =  cls(references = {}, has_synced=has_synced)
  #   # update state from dict
  #   for ref_dict in state_dict["references"]:
  #     id_molstar = ref_dict["molstarKey"]
  #     id_viewer = ref_dict["phenixKey"]

  #     ref = Reference(id_molstar=id_molstar, id_viewer = id_viewer, structures = [])
  #     phenix_state.references[id_viewer] = ref
  #     # now modify within a ref
  #     for structure_dict in ref_dict['structures']:
  #       structure = Structure(
  #         phenixKey=structure_dict["phenixKey"],
  #         phenixReferenceKey=structure_dict['phenixReferenceKey'],
  #         data_id=structure_dict["data_id"],
  #         key=structure_dict["key"],
  #         components=[])
  #       ref.structures.append(structure)
  #       for component_dict in structure_dict['components']:
  #         component = Component(phenixKey=component_dict["phenixKey"],representations=[],key=component_dict["key"])
  #         structure.components.append(component)

  #         for representation_dict in component_dict["representations"]:
  #           representation = Representation(phenixKey=representation_dict["phenixKey"],name=representation_dict["name"])

  #           component.representations.append(representation)

  #   return phenix_state

@dataclass
class SelectionPoll(ApiClass):
  place_holder: str = "selection_placeholder"
