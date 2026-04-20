import csv
from models.room import Room


def load_rooms_from_csv(csv_path):
    """Load rooms from CSV, preserving full min/target range for per-variant sampling."""
    rooms = []

    with open(csv_path, newline="") as csvfile:
        reader = csv.DictReader(csvfile)

        for row in reader:
            min_area = float(row["Minimum Area"])
            target_area = float(row["Target Area"])

            room = Room(
                name=row["Name"],
                room_type=row["Type"],
                category=row["Category"],
                target_area=target_area,
                min_area=min_area
            )

            # Range bounds used for per-variant area sampling
            room.minimum_area = min_area
            room.original_target_area = target_area

            rooms.append(room)

    return rooms
