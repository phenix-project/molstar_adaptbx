# LIBTBX_SET_DISPATCHER_NAME phenix.molstar_setup
from __future__ import absolute_import, division, print_function

from iotbx.cli_parser import run_program, CCTBXParser
from molstar_adaptbx.programs import molstar_setup

class MolstarParser(CCTBXParser):
  def __init__(self,*args,**kwargs):
    super().__init__(*args,**kwargs)

  def parse_args(self, args, skip_help = True):
    # Allow running without args
    return super().parse_args(args,skip_help=skip_help)


if __name__ == '__main__':
  run_program(program_class=molstar_setup.Program,parser_class=MolstarParser)
