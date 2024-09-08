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

from molstar_adaptbx.phenix.server_utils import  NodeHttpServer
from molstar_adaptbx.phenix.utils import generate_uuid
from molstar_adaptbx.phenix.api import ApiClass, Request,RawJS, MolstarState


# =============================================================================

class MolstarGraphics(ModelViewer):
  """
  The Python interface for the molstar viewer.
  """
  viewer_name = 'Molstar'
  config_default = {
    "molstar_env_name":"molstar_env",
    "molstar_build_dir":str(Path(__file__).parent / "../../molstar/build/phenix-viewer")
    }

  def __init__(self,web_view=None,dm=None,config=None):
    ModelViewer.__init__(self)
    if not config:
      config = self.config_default.copy()
    self.config = config
    self.molstar_build_dir = config["molstar_build_dir"]
    self.molstar_env_name = config["molstar_env_name"]
    self.api_url = 'http://localhost:3000/api-request'
    self.plugin_prefix="viewer"
    self.web_view = web_view
    self.state = group_args(molstarState=None)
    self.dm = dm
    self.loaded = {}

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



    # Start volume streaming server TODO: This should only occur if volumes will be used
    # if volume_streaming:
    #   self.log()
    #   self.log('-'*79)
    #   self.log('Starting volume streaming server')
    #   self.volume_streamer = VolumeStreamingManager(
    #             node_js_path = self.config.node_js_path,
    #             volume_server_relative_path = self.config.volume_server_relative_path,
    #             pack_script_relative_path = self.config.pack_script_relative_path,
    #             default_server_port=1336,
    #             debug = True
    #   )
    #   self.volume_streamer.start_server()
    #   self.log(self.volume_streamer.url)
    #   self.log('-'*79)
    #   self.log()


    # Start node http-server
    self.log()
    self.log('-'*79)
    self.log('Starting HTTP server for Molstar')
    self.command = self.find_viewer()
    self.view_server = NodeHttpServer(self.command)
    self.view_server.start()
    self.command = self.view_server.command
    self.port = self.view_server.port
    self.url = self.view_server.url
    #subprocess.run(self.api_server_command)
    # Set url on web view

    if not self.web_view:
      time.sleep(3)
      # open in browser
      webbrowser.open(self.url)
    else:
      # open in qt web view
      self.web_view.setUrl(QUrl(self.url))


      counter = 0
      while counter<timeout:
        self._check_status()
        if self._connected:
          break
        counter += 1
        time.sleep(1)
      if not self._connected:
        raise Sorry('The Molstar on the QT web view is not reachable at {} after '
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
    self.view_server.stop()
    if hasattr(self,"volume_streamer"):
      self.volume_streamer.stop_server()
    self.log('='*79)

  def log_message(self,message):
    self.log_list.append(message)

  # ---------------------------------------------------------------------------
  # Remote communication


  def send_request(self,request: Request):
    # Send the POST request with the JSON data
    response = requests.post(self.api_url, json=request.to_dict())
    d = response.json()
    if isinstance(d,dict) and  "responses" in d:
      try:      
        if "success" not in d or not d["success"]:
            return None
        if isinstance(d,dict) and  "responses" in d and isinstance(d["responses"],list):
          if isinstance(d["responses"][0],dict) and "output" in d["responses"][0]:
            return json.loads(d["responses"][0]["output"])
      except:
        print("Failed to unpack responses")
        print(response.text)

   

  def send_command(self, js_command,callback=print,sync=False,log_js=False):
    # Raw js command
    if log_js:
      self.log("JavaScript command:")
      self.log(js_command)
    
    rawJs = RawJS(js=js_command)
    req = Request(data=rawJs)
    return self.send_request(req)



    

    # if log_js:
    #   self.log("JavaScript command:")
    #   lines = js_command.split("\n")
    #   self.log("Total Lines: ",len(lines))
    #   if len(lines)>40:
    #     lines = lines[:20]+["","...",""]+ lines[-20:]
    #     js_command_print = "\n".join(lines)
    #   else:
    #     js_command_print = js_command
    #   self.log(js_command_print)
    #   self.log("Callback:",callback)
    # if not sync:
    #   js_command= f"""
    #   (async () => {{
    #       {js_command}
    #   }})();
    #   """
    #   result =  self.web_view.runJavaScript(js_command,custom_callback=callback)
    # else:
    #   result =  self.web_view.runJavaScriptSync(js_command,custom_callback=callback)


    # return result


  # ---------------------------------------------------------------------------
  # Models

  def _load_model_build_js(self,model_str,format='pdb',label=None,ref_id=None):
    assert ref_id is not None, 'Cannot load into molstar without defining a Python identifier (ref_id)'
    assert label is not None, 'Cannot load into molstar without label'
    js_str = f"""
    var model_str = `{model_str}`
    {self.plugin_prefix}.phenix.loadStructureFromPdbString(model_str,'{format}', '{label}', '{ref_id}')
    """
    return js_str


  def load_model(self,filename=None,ref_id=None):
    if not ref_id:
      ref_id = generate_uuid()
      self.loaded[ref_id] = filename

    model = self.dm.get_model(filename=filename)
    format='pdb'
    label="model"
    callback=None

    func_name = f"model_as_{format}"
    func = getattr(model,func_name)
    model_str = func()

    command =  self._load_model_build_js(model_str,format=format,label=label,ref_id=ref_id)
    self.send_command(command,sync=False)


  # ---------------------------------------------------------------------------
  # Selection

  def _build_query_string(self,selection_test_text):
    # Returns js string to set 'query' from a Selection object
    js_str = f"""
    const MS = {self.plugin_prefix}.MS
    const sel = MS.struct.generator.atomGroups({{
              'atom-test': {selection_test_text}}})
    const query = {self.plugin_prefix}.StructureSelectionQuery('Phenix Query',sel)
    """
    return js_str
    

  def select_from_string(self,selection_string):
    """
    Make a selection from a Selection object. All other selection functions lead here
    """
    self.deselect_all()
    command = f"""
    {self._build_query_string(selection_string)}
    {self.plugin_prefix}.phenix.selectFromQuery(query);
    """
    self.send_command(command)


  def poll_selection(self,callback=None):
    """
    Get the current selection as a new selection object.
    """
    poll = SelectionPoll()
    response = viewer.send_request(Request(data=poll))
    atom_records = json.loads(response)
    return atom_records



    # command = f"""
    # {self.plugin_prefix}.phenix.pollSelection();
    # """
    # result_str = self.send_command(command,callback=callback,sync=True)
    # try:
    #   atom_records = json.loads(result_str)
    #   # TODO: don't require selection code in adaptbx?
    #   #selection = Selection.from_atom_records(atom_records)
    #   return selection
    # except:
    #   self.log(result_str)
    #   raise
    #   return None

  def focus_selected(self):
    """
    Focus on the selected region
    """
    command = f"""
    {self.plugin_prefix}.phenix.focusSelected();
    """
    self.send_command(command,sync=True)

  def select_all(self):
    command = f"{self.plugin_prefix}.phenix.selectAll()"
    self.send_command(command)

  def deselect_all(self):
    command = f"{self.plugin_prefix}.phenix.deselectAll()"
    self.send_command(command)


  # ---------------------------------------------------------------------------
  # Other

  def clear_viewer(self):
    # Remove all objects from the viewer
    command = f"{self.plugin_prefix}.plugin.clear()"
    self.send_command(command)

  def reset_camera(self):
    command = f"{self.plugin_prefix}.plugin.managers.camera.reset();"
    self.send_command(command)

  def _toggle_selection_mode(self,value):
    if value == True:
      value = 'true'
    else:
      value = 'false'
    command = f"""
    {self.plugin_prefix}.phenix.toggleSelectionMode({value});
    """
    self.send_command(command)

  def _set_granularity(self,value="residue"):
    assert value in ['element','residue'], 'Provide one of the implemented picking levels'
    if value == "element":
      command = f"{self.plugin_prefix}.plugin.managers.interactivity.setProps({{ granularity: 'element' }})"
    elif value == "residue":
      command = f"{self.plugin_prefix}.plugin.managers.interactivity.setProps({{ granularity: 'residue' }})"
    self.send_command(command)


  # ---------------------------------------------------------------------------
  # Synchronization
  def sync_remote(self,callback=None,verbose=True):
    molstar_state = MolstarState.from_empty()
    req = Request(data=molstar_state)
    # Send the POST request with the JSON data
    response = requests.post(self.api_url, json=req.to_dict())
    response_json = json.loads(response.json()["responses"][0]["output"])
    molstar_state = MolstarState.from_json(response_json)
    return molstar_state
