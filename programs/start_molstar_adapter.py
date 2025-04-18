from __future__ import absolute_import, division, print_function
import subprocess
import sys
import os
import time
from pathlib import Path
import code
from phenix.program_template import ProgramTemplate
from libtbx import group_args
import mmtbx
import libtbx
from libtbx import easy_run
from mmtbx.monomer_library.pdb_interpretation import grand_master_phil_str
from molstar_adaptbx.phenix.molstar import MolstarGraphics
from molstar_adaptbx.phenix.server_utils import  NodeHttpServer
# =============================================================================


banner = """
**************************************************************
*    Welcome to the Phenix - Molstar interactive viewer      *
**************************************************************
*                                                            *
* Use Python to interact with molstar:                       *
*                                                            *
*   - 'self': the CCTBX program template instance            *
*   - 'self.graphics': the CCTBX model viewer instance       *
*                                                            *
* Example usage:                                             *
*   - 'self.graphics.load_model('model.pdb')'                *
*   - 'self.graphics.select("chain A")'                      *
*                                                            *
* Type 'exit()' or press Ctrl+D to quit.                     *
**************************************************************

Interactive session starting...
"""


class Program(ProgramTemplate):

  description = """
  Demo program to visualize models molstar and access from Python
  """

  datatypes = ['phil','model']


  master_phil_str = """

  view_server_port = 5000
    .type = int
    .help = "The port for viewing molstar"

  allow_port_change = True
    .type = bool
    .help = "If first choice port is occupied, change to another open port"
    include scope mmtbx.monomer_library.pdb_interpretation.grand_master_phil_str

  root_prefix = ""
   .type = str
   .help = "If not default value of emtpy string, then the root directory of the molstar install."

  interactive = True
    .type = bool
    .help = "Whether to start the interactive code console."

  keep_alive = False
    .type = bool
    .help = "Whether to return the program task within the results for further interaction."

  fetch_pdb = None
   .type = str
   .help = "Optionally fetch a pdb file"

  """

  def validate(self):
    pass


  def get_results(self):
    return self.results



  def initiate_viewer(self):
    # Set up a server to serve the molstar app

    
    if self.params.root_prefix == "":
      molstar_install_dir = str(Path(__file__).parent.parent.parent.parent / "build" / "molstar")
    else:
      molstar_install_dir = self.params.root_prefix
    
    
    self.server = NodeHttpServer([
      "node",
      f"{molstar_install_dir}/src/phenix/server.js"
    ],port=self.params.view_server_port,allow_port_change=self.params.allow_port_change)

    graphics = MolstarGraphics(
      dm=self.data_manager,
      server = self.server,
    )
    return graphics



  def run(self):
    if self.params.fetch_pdb is not None:
      cmd = "phenix.fetch_pdb "+self.params.fetch_pdb
      easy_run.call(cmd)
    for filename in  os.listdir(os.getcwd()):
      if self.params.fetch_pdb in filename:
        self.data_manager.process_model_file(filename)
        break
    self.graphics = self.initiate_viewer()
    self.graphics.start_viewer()
    # If default model is set, load it immediately
    default_filename = self.data_manager._default_model
    if default_filename:
      print(f"Found default model with filename: {default_filename}")
      time.sleep(1)
      self.graphics.load_model(default_filename)

    # Start interactive shell
    if self.params.interactive:
      code.interact(banner=banner,local=locals())
    if self.params.keep_alive:
      task = self
    else:
      task = None
    self.results = group_args(task=self,url=self.server.url)
