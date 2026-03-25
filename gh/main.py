"""
Main entry point for layout generation.
Reusable from VS Code or Grasshopper.
"""

import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))
sys.path.append(project_root)

from models.boundary import Boundary
from models.layout import Layout
from services.csv_loader import load_rooms_from_csv
from services.packing_engine import pack_rooms
from services.exporter import export_layout

import json

def generate_layout(boundary_width, boundary_height, csv_path, config=None):
    boundary = Boundary(boundary_width, boundary_height)
    rooms = load_rooms_from_csv(csv_path)
    packed_rooms = pack_rooms(boundary, rooms, config=config)
    layout = Layout(boundary, packed_rooms)
    return layout

def generate_layout_from_parameters():

    parameters_path = os.path.join(project_root, "exports", "parameters.json")
    csv_path = os.path.join(project_root, "data", "room_program.csv")
    export_path = os.path.join(project_root, "exports", "layout.json")

    # Load parameters
    with open(parameters_path) as f:
        params = json.load(f)

    # Boundary
    boundary_width = params["boundary"]["width"]
    boundary_height = params["boundary"]["height"]

    boundary = Boundary(boundary_width, boundary_height)

    # Load rooms
    rooms = load_rooms_from_csv(csv_path)

    # Override room areas
    for room in rooms:

        if room.name in params["program"]:
            program = params["program"][room.name]

            if program["target"] is not None:
                room.target_area = program["target"]

            if program["min"] is not None:
                room.min_area = program["min"]

    # Pack rooms
    packed_rooms = pack_rooms(boundary, rooms)

    layout = Layout(boundary, packed_rooms)

    # Export layout
    export_layout(layout, export_path)

    return layout

if __name__ == "__main__":

    parameters_path = os.path.join(project_root, "exports", "parameters.json")

    if os.path.exists(parameters_path):

        layout = generate_layout_from_parameters()

    else:

        test_csv_path = os.path.join(project_root, "data", "room_program.csv")
        layout = generate_layout(25, 10, test_csv_path)

    print("Net Area:", layout.net_floor_area())
    print("Packing Efficiency:", layout.packing_efficiency())