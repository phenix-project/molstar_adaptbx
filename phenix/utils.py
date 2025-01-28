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
