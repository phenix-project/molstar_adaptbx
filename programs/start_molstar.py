from __future__ import absolute_import, division, print_function
import subprocess
import sys

from phenix.program_template import ProgramTemplate
from libtbx import group_args
import mmtbx
from mmtbx.monomer_library.pdb_interpretation import grand_master_phil_str
from qttbx.viewers.gui.view.apps.molstar_base_app import MolstarBaseAppView
from qttbx.viewers.gui.controller.apps.molstar_base_app import MolstarBaseAppController
from qttbx.viewers.gui.model.state import State

from PySide2.QtCore import Qt
from PySide2.QtWidgets import QApplication
QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
# =============================================================================

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

    # start app
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    app = QApplication(sys.argv)

    # get icon
    #icon_path =  Path(__file__).parent / '../view/assets/icons/phenix/icon.icns'
    #icon = QIcon(str(icon_path))
    #qapp.setWindowIcon(icon)
    
    # Core top level object initialization
    self.state = State(self.data_manager,params=self.params)
    self.view = MolstarBaseAppView()
    self.controller = MolstarBaseAppController(parent=self.state,view=self.view)

    # Start
    self.controller.view.show()
    sys.exit(app.exec_())
