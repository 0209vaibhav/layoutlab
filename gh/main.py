"""
Main entry point for Grasshopper execution.
"""

import os
import sys

# Add project root to Python path so imports work in Grasshopper
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))
sys.path.append(project_root)

from models.boundary import Boundary
from models.layout import Layout
from services.csv_loader import load_rooms_from_csv


def run(csv_path):
    # 1. Create boundary (25 x 10 as specified)
    boundary = Boundary(25, 10)

    # 2. Load rooms from CSV
    rooms = load_rooms_from_csv(csv_path)

    # 3. Create layout object
    layout = Layout(boundary, rooms)

    return layout


if __name__ == "__main__":
    # Temporary test path (adjust if needed)
    test_csv_path = os.path.join(project_root, "data", "room_program.csv")

    layout = run(test_csv_path)

    print("Loaded Rooms:")
    for room in layout.rooms:
        print(room.name, room.target_area)

    print("Gross Floor Area:", layout.boundary.area())