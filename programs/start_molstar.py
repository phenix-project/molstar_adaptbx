from __future__ import absolute_import, division, print_function
import subprocess
import sys

import code
from phenix.program_template import ProgramTemplate
from libtbx import group_args
import mmtbx
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
*   - 'self': the CCTBX program template instance            *
*   - 'self.data_manager.get_model()': get the MMTBX model   *
*   - 'self.viewer': the CCTBX model viewer instance         *
*   - 'self.viewer.select_all()': send a command to molstar  *
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

  """

  def validate(self):
    pass


  def get_results(self):
    return group_args()



  def run(self):
    # Set up a server to serve the molstar app
    view_server = NodeHttpServer([
      "/Users/user/software/miniforge3/envs/molstar_env/bin/http-server",
      "/Users/user/software/debug/modules/molstar/build/phenix-viewer"
    ],port=self.params.view_server_port,allow_port_change=self.params.allow_port_change)

    # Set up a server to expose the api
    api_server = NodeHttpServer([
       "/Users/user/software/miniforge3/envs/molstar_env/bin/node",
       "/Users/user/software/debug/modules/molstar/src/phenix/server.js",
    ],port=view_server.port)
    self.viewer = MolstarGraphics(
      dm=self.data_manager,
      view_server = view_server,
      api_server = api_server
    )
    self.viewer.start_viewer()

    # Start interactive shell
    code.interact(banner=banner,local=locals())