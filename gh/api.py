from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))
sys.path.append(project_root)

from models.boundary import Boundary
from models.layout import Layout
from services.csv_loader import load_rooms_from_csv
from services.packing_engine import pack_rooms
from services.exporter import build_room_geometry

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


@app.route("/generate-layout", methods=["POST"])
def generate_layout_api():

    params = request.json

    csv_path = os.path.join(project_root, "data", "room_program.csv")

    boundary = Boundary(
        params["boundary"]["width"],
        params["boundary"]["height"]
    )

    variants = []

    profiles = ["compact", "balanced", "generous"]
    rotations = [False, True]
    sorts = ["area_desc", "area_asc"]

    for profile in profiles:
        for rotation in rotations:
            for sort in sorts:

                rooms = load_rooms_from_csv(csv_path, profile=profile)

                # Override user parameters
                for room in rooms:
                    if room.name in params["program"]:
                        program = params["program"][room.name]

                        if program["target"]:
                            room.target_area = program["target"]

                        if program["min"]:
                            room.min_area = program["min"]

                config = {
                    "rotation": rotation,
                    "sort_strategy": sort
                }

                packed = pack_rooms(boundary, rooms, config=config)

                layout = Layout(boundary, packed)

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

                variant = {
                    "rooms": rooms_data,
                    "metrics": {
                        "gross_floor_area": layout.boundary.area(),
                        "net_floor_area": layout.net_floor_area(),
                        "private_area": layout.private_area(),
                        "common_area": layout.common_area(),
                        "packing_efficiency": layout.packing_efficiency(),
                        "private_ratio": layout.private_area() / layout.net_floor_area() if layout.net_floor_area() else 0,
                        "common_ratio": layout.common_area() / layout.net_floor_area() if layout.net_floor_area() else 0
                    },
                    "profile": profile,
                    "rotation": rotation,
                    "sort_strategy": sort,
                    "efficiency": layout.packing_efficiency()
                }

                variants.append(variant)

    # Sort best → worst
    variants.sort(key=lambda v: v["efficiency"], reverse=True)

    output = {
        "boundary": boundary.to_dict(),
        "variants": variants
    }

    return jsonify(output)


if __name__ == "__main__":
    app.run(debug=True, port=8000)