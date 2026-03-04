"""
Exporter service.
Converts Layout object into structured JSON
and writes it to disk.
"""

import json
import os


def build_room_geometry(room):
    """
    Build explicit geometry representation for a room.
    Includes origin, width/height, and corner coordinates.
    """

    x = room.x
    y = room.y
    w = room.width
    h = room.height

    return {
        "origin": {"x": x, "y": y},
        "width": w,
        "height": h,
        "corners": [
            {"x": x, "y": y},
            {"x": x + w, "y": y},
            {"x": x + w, "y": y + h},
            {"x": x, "y": y + h}
        ]
    }


def export_layout(layout, export_path):
    """
    Export full layout to JSON file.
    """

    rooms_data = []

    for room in layout.rooms:
        rooms_data.append({
            "name": room.name,
            "type": room.room_type,
            "category": room.category,
            "target_area": room.target_area,
            "minimum_area": room.min_area,
            "computed_area": room.area(),
            "geometry": build_room_geometry(room)
        })

    output = {
        "boundary": layout.boundary.to_dict(),
        "rooms": rooms_data,
        "metrics": {
            "gross_floor_area": layout.boundary.area(),
            "net_floor_area": layout.net_floor_area(),
            "private_area": layout.private_area(),
            "common_area": layout.common_area(),
            "packing_efficiency": layout.packing_efficiency(),
            "private_ratio": layout.private_area() / layout.net_floor_area() if layout.net_floor_area() else 0,
            "common_ratio": layout.common_area() / layout.net_floor_area() if layout.net_floor_area() else 0
        }
    }

    # Ensure exports directory exists
    os.makedirs(os.path.dirname(export_path), exist_ok=True)

    with open(export_path, "w") as f:
        json.dump(output, f, indent=4)

    return output