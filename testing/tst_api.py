import tempfile
from pathlib import Path
from collections import defaultdictfrom cctbx.crystal.tst_super_cell import pdb_str_1yjp
from iotbx.cli_parser import run_program, get_program_params
from libtbx.utils import null_out
from molstar_adaptbx.programs import start_molstar_adapter



atom_records_1yjp = {
  "auth_asym_id":
['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],

"label_asym_id":
['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A_1', 'A_1', 'A_1', 'A_1', 'A_1', 'A_1', 'A_1'],

"auth_comp_id":
['GLY', 'GLY', 'GLY', 'GLY', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'HOH', 'HOH', 'HOH', 'HOH', 'HOH', 'HOH', 'HOH'],

"label_comp_id":
['GLY', 'GLY', 'GLY', 'GLY', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'GLN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'ASN', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'TYR', 'HOH', 'HOH', 'HOH', 'HOH', 'HOH', 'HOH', 'HOH'],

"auth_seq_id":
[1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 9, 10, 11, 12, 13, 14],

"label_seq_id":
[1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 9, 10, 11, 12, 13, 14],

"auth_atom_id":
['N', 'CA', 'C', 'O', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'OD1', 'ND2', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'OD1', 'ND2', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'OE1', 'NE2', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'OE1', 'NE2', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'OD1', 'ND2', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'CD1', 'CD2', 'CE1', 'CE2', 'CZ', 'OH', 'OXT', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],

"label_atom_id":
['N', 'CA', 'C', 'O', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'OD1', 'ND2', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'OD1', 'ND2', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'OE1', 'NE2', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'OE1', 'NE2', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'OD1', 'ND2', 'N', 'CA', 'C', 'O', 'CB', 'CG', 'CD1', 'CD2', 'CE1', 'CE2', 'CZ', 'OH', 'OXT', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],

"label_alt_id":
['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],

"id":
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66],

}


def tst_program_template():

  with tempfile.NamedTemporaryFile(delete=False, suffix=".pdb") as temp_file:
    temp_file.write(pdb_str_1yjp.encode('utf-8'))  #temp_file is opened as
    temp_file_path = temp_file.name
  args = [temp_file_path,"interactive=False", "keep_alive=True"]
  result = run_program(program_class=start_molstar_adapter.Program, args=args, logger=null_out())
  assert result.task is not None
  return result.task


def tst_focus(graphics):
  graphics.focus()

def tst_select_all(graphics):
  graphics.select_all()


def tst_selection_mode_on(graphics):
  graphics.selection_mode_on()


def tst_selection_mode_off(graphics):
  graphics.selection_mode_off()


def tst_picking_granularity(graphics):
  graphics.set_granularity("element")
  graphics.set_granularity("residue")
  graphics.set_granularity("element")



def tst_poll_selection(graphics,printing=False):
  atom_records = graphics.poll_selection()
  poll = defaultdict(list)
  for record in atom_records:
    for key,value in record.items():
      poll[key].append(value)
  if printing:
    for key,value in poll.items():
      print(key)
      print(value)
      print()

  passed =  poll == atom_records_1yjp
  if not passed:
    print("Mismatch between polled selection and expected for 1yjp.")
    import pdb
    pdb.set_trace()


def tst_select_none(graphics):
  graphics.select_none()

if __name__ == '__main__':
  task = tst_program_template()
  graphics = task.graphics
  tst_select_all(graphics)
  tst_poll_selection(graphics)
  tst_focus(graphics)
  tst_selection_mode_on(graphics)
  tst_selection_mode_off(graphics)
  tst_select_all(graphics)
  tst_poll_selection(graphics)
  tst_select_none(graphics)
  tst_picking_granularity(graphics)
  print('OK')
