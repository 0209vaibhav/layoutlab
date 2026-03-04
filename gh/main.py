"""
Main entry point for Grasshopper execution.
"""

import os
import sys

# Add project root to Python path so imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))
sys.path.append(project_root)

from models.boundary import Boundary
from models.layout import Layout
from services.csv_loader import load_rooms_from_csv
from services.packing_engine import pack_rooms
from services.exporter import export_layout


def run(csv_path):
    # 1. Create boundary (25 x 10 as specified)
    boundary = Boundary(25, 10)

    # 2. Load rooms
    rooms = load_rooms_from_csv(csv_path)

    # 3. Pack rooms
    packed_rooms = pack_rooms(boundary, rooms)

    # 4. Create layout
    layout = Layout(boundary, packed_rooms)

    export_path = os.path.join(project_root, "exports", "layout.json")
    export_layout(layout, export_path)

    return layout


if __name__ == "__main__":
    test_csv_path = os.path.join(project_root, "data", "room_program.csv")

    layout = run(test_csv_path)

    print("Packed Rooms:")
    for room in layout.rooms:
        print(
            room.name,
            " | Pos:", (room.x, room.y),
            " | Size:", (round(room.width, 2), round(room.height, 2)),
            " | Area:", round(room.area(), 2)
        )

    print("Gross Floor Area:", layout.boundary.area())
    print("Net Floor Area:", layout.net_floor_area())