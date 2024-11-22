"""
This file defines the API for communication with the Phenix implementation of the molstar web app
"""

from pathlib import Path
import time
import json
from typing import Optional

import requests
import webbrowser
import urllib.parse
import subprocess

from qttbx.viewers import ModelViewer

from libtbx.utils import Sorry
from libtbx import group_args
from molstar_adaptbx.phenix.utils import generate_uuid
from molstar_adaptbx.phenix.api import (
  ApiClass,
  ApiRequest,
  RawJS,
  RawJSAsync, 
  MolstarState, 
  SelectionPoll,
  MakeSelection,
  LoadModel, 
  Focus,
  ClearViewer,
  ResetView,
  ToggleSelectionMode,
  SetPickingGranularity,
  AddRepresentation,
  SetColor,
)
# =============================================================================

class MolstarGraphics(ModelViewer):
  """
  The Python interface for the molstar viewer.
  """
  viewer_name = 'Molstar'


  def __init__(self,
      web_view=None,
      dm=None,
      server=None,
      ):
    super().__init__()
    self.server= server  # Exposes the api over http
    self.plugin_prefix="viewer"
    self.web_view = web_view
    self.dm = dm
    self.loaded = {}
    self.connection_id = generate_uuid()

    self.log_list = []
    self.debug = True
    self._initial_sync_done = False # Set to True the first time communication is established with js viewer


    # Flags
    self._blocking_commands = False

  def log(self,*args):
    if self.debug:
      print(*args)

  # ---------------------------------------------------------------------------
  # Start API
  # ---------------------------------------------------------------------------


  # ---------------------------------------------------------------------------
  # Status
  def is_available(self):
    '''
    Function for determining if Molstar is available

    Parameters
    ----------
      Nothing

    Returns
    -------
      True if available
    '''
    self.find_viewer()
    if self.command:
      return True
    else:
      return False

  def find_viewer(self):
    '''
    Function for finding Molstar

    Parameters
    ----------
      Nothing

    Returns
    -------
      Command for running Molstar
    '''

    self.command = ['http-server',self.molstar_build_dir]
    return self.command


  def start_viewer(self,volume_streaming=False,timeout=60):
    '''
    Function for starting Molstar. Sequence of events:
      1. Start web server for molstar app
      2. Start volume server for volume streaming

    Parameters
    ----------

    Returns
    -------
      Nothing
    '''

    # Start node http-server
    if self.server:
      self.log()
      self.log('-'*79)
      self.log('Starting HTTP server for Molstar')
      self.server.start()
      self.command = self.server.command
      self.port = self.server.port
      self.url = self.server.url
    
    # Set url on web view
    if not self.web_view:
      time.sleep(2)
      # open in browser
      webbrowser.open(self.url)
    else:
      # open in qt web view
      self.web_view.set_url(self.url)

    # Wait until ready
    counter = 0
    while counter<timeout:
      self._check_status()
      if self._connected:
        break
      counter += 1
      time.sleep(1)
    if not self._connected:
      raise Sorry(' Molstar not reachable at {} after '
                  '{} seconds.'.format(self.url, counter))
    self.log('Molstar is ready')
    self.log('-'*79)
    self.log()


  def _check_status(self):
    '''
    Check if the server is available
    '''
    output = None
    try:
      output = requests.get(url=self.url)
      if output.status_code == 200:
        self._connected = True
    except requests.exceptions.ConnectionError:
      self._connected = False
    return self._connected



  def close_viewer(self):
    self.server.stop()
    if hasattr(self,"volume_streamer"):
      self.volume_streamer.stop_server()
    self.log('='*79)

  def log_message(self,message):
    self.log_list.append(message)

  # ---------------------------------------------------------------------------
  # Remote communication

  @property
  def url_api(self):
    return self.server.url + "/run"

  def send_request(self,api_data: ApiClass):
    """
    Package up an instance of ApiClass and send it to the server. 
    Expects the response to be json that can isntantiate the ApiClass
    with the results present as populated member variables.

    This keeps all API calls contained to a single class definition.
    """
    request = ApiRequest(data=api_data)
    # Send the POST request with the JSON data
    response = requests.post(self.url_api, json=request.to_dict())
    # Response must have a very specific structure
    try:
      response_dict = response.json()
      # Mandatory checks
      assert isinstance(response_dict,dict)
      assert "responses" in response_dict
      assert "success" in response_dict and response_dict["success"]
      assert isinstance(response_dict,dict)
      assert "responses" in response_dict
      assert isinstance(response_dict["responses"],list)
      assert isinstance(response_dict["responses"][0],dict)
      assert "data" in response_dict["responses"][0]
      assert "output" in response_dict["responses"][0]["data"]
      output = response_dict["responses"][0]["data"]["output"]
      api_request = ApiRequest.from_json(json.loads(output))
      api_data = api_request.data
      return api_data
    except:
      print(response.text)
      raise RuntimeError("Response did not meet expected form.")

  

  # ---------------------------------------------------------------------------
  # Models


  def load_model(self,filename=None):
    """
    Load a model into viewer
    """

    # Store that this model has been loaded
    ref_id = generate_uuid()
    self.loaded[ref_id] = filename

    # Serialize as pdb string
    model = self.dm.get_model(filename=filename)
    model_str = model.model_as_pdb()
    call = LoadModel(pdb_str=model_str,ref_id=ref_id)
    self.send_request(call)


  # ---------------------------------------------------------------------------
  # Selection

  def _convert_selection(self,selection_string,src_type='phenix',dst_type='pymol'):
    assert src_type in ['phenix']
    assert dst_type in ['pymol']
    if src_type == 'phenix':
      # Check if cctbx is accessible for selection translation

      try:
        from qttbx.viewers.selection.parser import Parser
      except:
        raise RuntimeError("Unable to import selection translation from cctbx.\
         Cannot use phenix selection syntax.")

      # Carry on translating to pymol
      parser = Parser.from_string(selection_string)
      ast = parser.parse()

      if dst_type == 'pymol':
        pymol_sel = ast.pymol_string()
        return pymol_sel

  def select(self,selection_string,syntax="phenix"):
    assert syntax in ['phenix','pymol']
    if syntax == 'pymol':
      pymol_sel = selection_string# Pymol is the common target syntax
    if syntax == 'phenix':
      # Send pymol string to Molstar
      pymol_sel = self._convert_selection(selection_string)
    self.select_from_pymol(pymol_sel)
      
      

  def select_from_pymol(self,pymol_sel,reset=True,focus=True):
    """
    Make a selection from pymol selection string
    """
    if reset:
      self.select_none()
    call = MakeSelection(pymol_sel=pymol_sel,focus=focus)
    return self.send_request(call)


  def poll_selection(self,callback=None):
    """
    Get the current selected atoms as a dictionary of atom records
    """
    call = SelectionPoll()
    call = self.send_request(call)
    return call.atom_records


  def focus(self):
    """
    Focus on the selected region
    """
    call = Focus()
    self.send_request(call)

  def select_all(self):
    self.select_from_pymol("all")

  def select_none(self):
    self.select_from_pymol("none",reset=False,focus=False) # avoid recursion


  # ---------------------------------------------------------------------------
  # Other

  def clear_viewer(self):
    # Remove all objects from the viewer
    call = ClearViewer()
    self.send_request(call)
    
  def reset_camera(self):
    call = ResetView()
    self.send_request(call)

  def selection_mode_on(self):
    call = ToggleSelectionMode(is_selecting=True)
    self.send_request(call)

  def selection_mode_off(self):
    call = ToggleSelectionMode(is_selecting=False)
    self.send_request(call)

  def set_granularity(self,granularity="residue"):
    call = SetPickingGranularity(granularity=granularity)
    self.send_request(call)

  # ---------------------------------------------------------------------------
  # Synchronization

  def sync_remote(self):
    call = MolstarState.from_empty(connection_id=self.connection_id)
    return self.send_request(call)

  # ---------------------------------------------------------------------------
  # Representation

  def add_representation(self,representation_name):
    call = AddRepresentation(representation=representation_name)
    self.send_request(call)

  def set_color(self,color_string):
    call = SetColor(color_string=color_string)
    self.send_request(call)

  # ---------------------------------------------------------------------------
  # Custom javascript

  def send_command(self, js_command,callback=print,sync=True,log_js=False):
    # Raw js command
    if log_js:
      self.log("JavaScript command:")
      self.log(js_command)
    if sync:
      rawJs = RawJS(js=js_command)
      req = ApiRequest(data=rawJs)
    else:
      rawJs = RawJSAsync(js=js_command)
      req = ApiRequest(data=rawJs)
    return self.send_request(req)
