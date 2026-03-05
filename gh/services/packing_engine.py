"""
Packing engine using rectpack.
Config-driven version supporting rotation,
sorting strategies, and aspect ratio control.
"""

import math
from rectpack import newPacker


# --------------------------------------------------
# 1️⃣ Default Configuration
# --------------------------------------------------

DEFAULT_CONFIG = {
    "rotation": True,
    "sort_strategy": "area_desc",   # options: area_desc, area_asc, none
    "aspect_ratio_multiplier": 1.0
}


# --------------------------------------------------
# 2️⃣ Aspect Ratios by Room Type
# --------------------------------------------------

ASPECT_RATIOS = {
    "living": 1.6,
    "kitchen": 1.3,
    "bedroom": 1.2,
    "bathroom": 0.9,
    "circulation": 2.0
}


# --------------------------------------------------
# 3️⃣ Assign Dimensions
# --------------------------------------------------

def assign_dimensions(room, config):
    """
    Assign width & height based on room type and config.
    """

    base_ratio = ASPECT_RATIOS.get(room.room_type, 1.2)
    ratio = base_ratio * config.get("aspect_ratio_multiplier", 1.0)

    height = math.sqrt(room.target_area / ratio)
    width = room.target_area / height

    room.set_dimensions(width, height)


# --------------------------------------------------
# 4️⃣ Packing Logic
# --------------------------------------------------

def pack_rooms(boundary, rooms, config=None):
    """
    Packs rooms into boundary using rectpack.
    Config controls rotation, sorting, aspect ratio.
    """

    if config is None:
        config = DEFAULT_CONFIG

    # Assign dimensions first
    for room in rooms:
        assign_dimensions(room, config)

    # Sorting strategy
    if config["sort_strategy"] == "area_desc":
        rooms.sort(key=lambda r: r.area(), reverse=True)

    elif config["sort_strategy"] == "area_asc":
        rooms.sort(key=lambda r: r.area())

    elif config["sort_strategy"] == "none":
        pass

    # Initialize packer with rotation config
    packer = newPacker(rotation=config["rotation"])

    # Add boundary as bin
    packer.add_bin(boundary.width, boundary.height)

    # Add rectangles
    for idx, room in enumerate(rooms):
        packer.add_rect(room.width, room.height, idx)

    # Execute packing
    packer.pack()

    # Assign packed positions back to rooms
    for rect in packer.rect_list():
        _, x, y, w, h, rid = rect
        rooms[rid].set_position(x, y)

    return rooms