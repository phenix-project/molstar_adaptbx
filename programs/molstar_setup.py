from __future__ import absolute_import, division, print_function
from pathlib import Path
import subprocess
import shutil
import os
import json
from libtbx.program_template import ProgramTemplate
from molstar_adaptbx.phenix.utils import (
  create_conda_env,
  install_package_in_env,
  run_command_in_env,
  run_command,
  get_conda_env_directory
)



class Program(ProgramTemplate):

  master_phil_str = """

  molstar_env_name = molstar_env
    .type = str
    .help = "The name for the Python conda env used with molstar"
  """

  datatypes = ['phil']

  def validate(self):
    pass

  def run(self):

    # First check if the molstar repo exists in the expeected locaion (one level up from adaptbx)
    adaptbx_dir = Path(__file__).parent.parent
    molstar_dir = adaptbx_dir.parent / "molstar"
    env_name = self.params.molstar_env_name

        

    if not molstar_dir.exists():
      self._print("ERROR: the molstar git repo not found")
      return
    
    # If directory exists, assume it is the correct git repo. Copy files there:
    adaptbx_viewer_dir = adaptbx_dir / "molstar/src/apps/phenix-viewer"
    molstar_viewer_dir = molstar_dir / "src/apps/phenix-viewer"
    self._print(f"Will copy phenix plugin directory:")
    self._print(f"\tfrom: {adaptbx_viewer_dir }")
    self._print(f"\tto: {molstar_viewer_dir}")
    if molstar_viewer_dir.exists():
      self._print("Destination exists, removing...")
      shutil.rmtree(molstar_viewer_dir)
    self._print("Copying...")
    shutil.copytree(adaptbx_viewer_dir, molstar_viewer_dir)
    self._print("Done.\n\n")

    # install js dependencies, build typescript
    self._print("Building molstar...")
    
    packages = [
      '"nodejs>=20"',
    ]

    create_conda_env(env_name)
    env_dir = get_conda_env_directory(env_name)
    for package in packages:
      install_package_in_env(env_name, package)

    npm_bin_path = f"{env_dir}/bin/npm"
    commands = [ 
        f"{npm_bin_path} install -g http-server --prefix {env_dir}", # -g for global is important
        f"{npm_bin_path} install --prefix {molstar_dir}",
        f"{npm_bin_path} run build --prefix {molstar_dir}",
    ] 
    for command in commands:
      run_command_in_env(env_name, command)

    # Write config file
    config = {
      "molstar_env_name":env_name,
      "molstar_build_dir":str(molstar_dir)
      }
    with Path(adaptbx_dir,"phenix","config.json").open("w") as f:
      json.dump(config,f,indent=2)
    self._print("Done.\n\n")

    # Start molstar
    command = f"{env_dir}/bin/http-server {molstar_dir}"
    print('starting molstar:')
    print(command)
    run_command(command)



  def get_results(self):
    pass
