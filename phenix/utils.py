import subprocess
import hashlib
import uuid
import os
import shutil
from iotbx.cli_parser import run_program, CCTBXParser


class MolstarParser(CCTBXParser):
  """
  This seems to be required to allow running programs without args..
  """
  def __init__(self,*args,**kwargs):
    super().__init__(*args,**kwargs)

  def parse_args(self, args, skip_help = True):
    # Allow running without args
    return super().parse_args(args,skip_help=skip_help)


def run_command(command,print_func=print):
  """Utility function to run a shell command and print the output in real-time."""
  process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
  while True:
    output = process.stdout.readline()
    if output == "" and process.poll() is not None:
      break
    if output:
      print_func(output.strip())
  return process.poll()

def create_conda_env(env_name,print_func=print):
  """Create a new conda environment."""
  print_func(f"Creating a new environment '{env_name}'...")
  run_command(f"conda create --name {env_name} -y",print_func=print_func)

def install_package_in_env(env_name, package_name,print_func=print):
  """Install the desired package in a conda environment."""
  print_func(f"Installing package '{package_name}' in environment '{env_name}'...")
  run_command(f"conda install --name {env_name} {package_name} -y",print_func=print_func)

def run_command_in_env(env_name, command,print_func=print):
  """Run a list of commands in a conda environment."""
  command = f"conda run --name {env_name} {command}"
  print_func(command)
  result = run_command(command)
  print_func(f"Command result: {result}")

def get_conda_env_directory(env_name,print_func=print):
  result = subprocess.run(['conda', 'env', 'list'], capture_output=True, text=True)
  # Find the environment path
  for line in result.stdout.splitlines():
    if env_name in line:
      # Extract the path to the environment
      env_path = line.split()[-1]
      print_func(f"Conda env directory for env: {env_name}")
      print_func(env_path)
      return env_path
  
  return None


def generate_uuid(length: int=24):
  # Generate a unique identifier
  full_uuid = str(uuid.uuid4())

  # Hash the UUID
  hashed_uuid = hashlib.sha1(full_uuid.encode()).hexdigest()

  # Truncate to the desired length
  short_uuid = hashed_uuid[:length]
  return short_uuid

