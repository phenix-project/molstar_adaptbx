# LIBTBX_SET_DISPATCHER_NAME phenix.install_molstar
from __future__ import absolute_import, division, print_function

from iotbx.cli_parser import run_program
from molstar_adaptbx.programs import install_molstar
from molstar_adaptbx.phenix.utils import MolstarParser

if __name__ == '__main__':
  run_program(program_class=install_molstar.Program,parser_class=MolstarParser)
