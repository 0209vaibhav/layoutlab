"""
CSV Loader service to read room_program.csv
and convert rows into Room objects.
"""

import csv
import os
from models.room import Room


def load_rooms_from_csv(csv_path):
    rooms = []

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    with open(csv_path, mode="r", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            room = Room(
                name=row["Name"],
                room_type=row["Type"],
                category=row["Category"],
                target_area=row["Target Area"],
                min_area=row["Minimum Area"]
            )
            rooms.append(room)

    return rooms