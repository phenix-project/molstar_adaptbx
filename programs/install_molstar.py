from __future__ import absolute_import, division, print_function
from pathlib import Path
import libtbx.load_env
import shutil
import os
import json
from libtbx.program_template import ProgramTemplate
from molstar_adaptbx.phenix.utils import (
  create_conda_env,
  install_package_in_env,
  run_command_in_env,
  run_command,
  get_conda_env_directory,
)

class Program(ProgramTemplate):

  master_phil_str = """

  """

  datatypes = ['phil']

  def validate(self):
    pass


  def run(self):
    # First check if the molstar repo exists in the expected location
    # (one level up from adaptbx)
    adaptbx_dir = libtbx.env.find_in_repositories(relative_path="molstar_adaptbx")
    molstar_dir = libtbx.env.find_in_repositories(relative_path="molstar")
    if not adaptbx_dir:
      raise Sorry("molstar_adaptbx directory not found")
    if not molstar_dir:
      raise Sorry("molstar directory not found")
    import pdb
    pdb.set_trace()
    adaptbx_dir = Path(adaptbx_dir)
    molstar_dir = Path(molstar_dir)
    molstar_build = Path(molstar_dir,"build")
    shutil.rmtree(molstar_build)

    # Install js dependencies
    self._print("Building molstar...")


    # Install nodejs dependencies
    npm_bin_path = f"npm"
    commands = [ ]

    commands += [
        f"{npm_bin_path}  install --prefix {molstar_dir}",
    ]

    commands += [
      f"{npm_bin_path} run clean --prefix {molstar_dir}",
      f"{npm_bin_path} run build --prefix {molstar_dir}",
    ]
    for command in commands:
      run_command(command,print_func=self._print)
    self._print("Done.\n\n")
