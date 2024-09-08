# LIBTBX_SET_DISPATCHER_NAME phenix.start_molstar
from __future__ import absolute_import, division, print_function

from iotbx.cli_parser import run_program
from molstar_adaptbx.phenix.utils import MolstarParser
from molstar_adaptbx.programs import start_molstar


if __name__ == '__main__':
  run_program(program_class=start_molstar.Program,parser_class=MolstarParser)
