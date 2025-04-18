"""
Utilities for running the molstar web server
"""
import http.server
import socketserver
from pathlib import Path
import socket
import tempfile
import subprocess
import json
import uuid

def generate_uuid():
  return str(uuid.uuid4())

class NodeHttpServer:
  def __init__(self,command,port=8080,allow_port_change=False):
    assert isinstance(command,list), "Provide command as a list of strings"
    if allow_port_change and not self.check_port_free(port):
      port = self.find_open_port()
    self.port = port
    self.url = f"http://localhost:{self.port}"
    self.process = None
    self.command_list = command+['--port',str(self.port)]
    self.command = ' '.join(self.command_list)
    self.debug = True

  def log(self,*args):
    if self.debug:
      print(*args)

  @staticmethod
  def find_open_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
      s.bind(("", 0))
      s.listen(1)
      port = s.getsockname()[1]
    return port


  @staticmethod
  def check_port_free(port, ip='localhost'):
    try:
      with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((ip, port))
        # If we get here, it means the bind was successful,
        # indicating the port is free.
        return True
    except OSError:
      # If an OSError is caught, it likely means the port is in use.
      return False


  def start(self):
    if self.process is None:
      print(f"Starting HTTP server at: {self.url}")
      print(f"Command used: {self.command}")
      print("Command list: ",self.command_list)

      self.process = subprocess.Popen(self.command_list,stdout=None,stderr=None)
    else:
      print("HTTP server is already running.")

  def stop(self):
    if self.process:
      print("Stopping HTTP server...")
      self.process.terminate()
      self.process = None
    else:
      print("HTTP server is not running.")

