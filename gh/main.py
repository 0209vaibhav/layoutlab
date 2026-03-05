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


def generate_layout(boundary_width, boundary_height, csv_path, config=None):
    boundary = Boundary(boundary_width, boundary_height)
    rooms = load_rooms_from_csv(csv_path)
    packed_rooms = pack_rooms(boundary, rooms, config=config)
    layout = Layout(boundary, packed_rooms)
    return layout


if __name__ == "__main__":
    # Debug mode only
    test_csv_path = os.path.join(project_root, "data", "room_program.csv")
    layout = generate_layout(25, 10, test_csv_path)

    print("Net Area:", layout.net_floor_area())
    print("Packing Efficiency:", layout.packing_efficiency())