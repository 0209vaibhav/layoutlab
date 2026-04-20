from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import copy
import random
import math

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


def _profile_label(areas, base_rooms):
    """Classify a set of sampled areas as compact / balanced / generous."""
    ratios = []
    for room in base_rooms:
        span = room.original_target_area - room.minimum_area
        if span > 0:
            ratios.append((areas[room.name] - room.minimum_area) / span)
    if not ratios:
        return "balanced"
    avg = sum(ratios) / len(ratios)
    if avg < 0.35:
        return "compact"
    if avg < 0.65:
        return "balanced"
    return "generous"


# Packing configs tried in order for each variant
PACKING_CONFIGS = [
    {"rotation": False, "sort_strategy": "area_desc"},
    {"rotation": False, "sort_strategy": "area_asc"},
    {"rotation": True,  "sort_strategy": "area_desc"},
    {"rotation": True,  "sort_strategy": "area_asc"},
    {"rotation": False, "sort_strategy": "none"},
    {"rotation": True,  "sort_strategy": "none"},
]


@app.route("/generate-layout", methods=["POST"])
def generate_layout_api():

    params = request.json or {}

    # ---------------------------
    # Boundary
    # ---------------------------

    boundary_params = params.get("boundary", {})
    boundary_width = boundary_params.get("width", 25)
    boundary_height = boundary_params.get("height", 10)
    boundary = Boundary(boundary_width, boundary_height)

    csv_path = os.path.join(project_root, "data", "room_program.csv")
    program_data = params.get("program", {})

    # ---------------------------
    # Load base rooms & apply user range overrides
    # ---------------------------

    base_rooms = load_rooms_from_csv(csv_path)

    for room in base_rooms:
        if room.name in program_data:
            program = program_data[room.name]
            target = program.get("target")
            minimum = program.get("min")
            if target is not None:
                room.original_target_area = float(target)
            if minimum is not None:
                room.minimum_area = float(minimum)
                room.min_area = float(minimum)

    # ---------------------------
    # Generate 12 variants, each with a unique area combination
    #
    # Each variant v gets independently sampled room areas (different seed per v),
    # then we try all packing configs in turn and use the first that places every room.
    # This gives 12 layouts with genuinely different room sizes and no overlaps.
    # ---------------------------

    N_VARIANTS = 12
    variants = []

    for v in range(N_VARIANTS):

        # Unique, reproducible area combination for this variant
        area_rng = random.Random(v * 1013 + 7)
        areas = {}
        for room in base_rooms:
            lo = room.minimum_area
            hi = room.original_target_area
            areas[room.name] = area_rng.uniform(lo, hi) if hi > lo else lo

        # Try each packing config until one places all rooms without gaps
        chosen_config = None
        chosen_layout = None
        chosen_rooms = None

        for cfg_offset in range(len(PACKING_CONFIGS)):
            config = PACKING_CONFIGS[(v + cfg_offset) % len(PACKING_CONFIGS)]

            rooms = copy.deepcopy(base_rooms)
            for room in rooms:
                room.target_area = areas[room.name]

            packed = pack_rooms(boundary, rooms, config=config)
            layout = Layout(boundary, packed)

            if any(r.x is None for r in layout.rooms):
                continue  # this config left rooms unplaced, try next

            chosen_config = config
            chosen_layout = layout
            chosen_rooms = packed
            break

        if chosen_layout is None:
            continue  # no config could place all rooms — skip this variant

        # ---------------------------
        # Build room data
        # ---------------------------

        rooms_data = []
        for room in chosen_rooms:
            rooms_data.append({
                "name": room.name,
                "type": room.room_type,
                "category": room.category,
                "target_area": round(areas[room.name], 2),
                "minimum_area": room.minimum_area,
                "computed_area": round(room.area(), 2),
                "geometry": build_room_geometry(room)
            })

        net = chosen_layout.net_floor_area()

        variant = {
            "rooms": rooms_data,
            "metrics": {
                "gross_floor_area": chosen_layout.boundary.area(),
                "net_floor_area": round(net, 2),
                "private_area": round(chosen_layout.private_area(), 2),
                "common_area": round(chosen_layout.common_area(), 2),
                "packing_efficiency": chosen_layout.packing_efficiency(),
                "private_ratio": chosen_layout.private_area() / net if net else 0,
                "common_ratio": chosen_layout.common_area() / net if net else 0
            },
            "profile": _profile_label(areas, base_rooms),
            "rotation": chosen_config["rotation"],
            "sort_strategy": chosen_config["sort_strategy"],
            "efficiency": chosen_layout.packing_efficiency()
        }

        variants.append(variant)

    variants.sort(key=lambda v: v["efficiency"], reverse=True)

    output = {
        "boundary": boundary.to_dict(),
        "variants": variants
    }

    return jsonify(output)


if __name__ == "__main__":
    app.run(debug=True, port=8000)
