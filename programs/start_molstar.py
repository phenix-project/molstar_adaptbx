from __future__ import absolute_import, division, print_function
import subprocess
import sys

import code
from phenix.program_template import ProgramTemplate
from libtbx import group_args
import mmtbx
from mmtbx.monomer_library.pdb_interpretation import grand_master_phil_str
from molstar_adaptbx.phenix.molstar import MolstarGraphics
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

  rest_server_port = 5000
    .type = int
    .help = "The port for http control"

    include scope mmtbx.monomer_library.pdb_interpretation.grand_master_phil_str

  """

  def validate(self):
    pass


  def get_results(self):
    return group_args()



  def run(self):

    self.viewer = MolstarGraphics(dm=self.data_manager)
    self.viewer.start_viewer()

    # Start interactive shell
    code.interact(banner=banner,local=locals())