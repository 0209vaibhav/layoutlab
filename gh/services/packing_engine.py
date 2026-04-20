"""
Packing engine using rectpack.
Supports configuration for rotation, sorting, and aspect ratios.
"""

import math
from rectpack import newPacker


# --------------------------------------------------
# Default configuration
# --------------------------------------------------

DEFAULT_CONFIG = {
    "rotation": False,
    "sort_strategy": "area_desc",
    "aspect_ratio_multiplier": 1.0
}


# --------------------------------------------------
# Aspect ratios
# --------------------------------------------------

ASPECT_RATIOS = {
    "living": 1.6,
    "kitchen": 1.3,
    "bedroom": 1.2,
    "bathroom": 0.9,
    "circulation": 2.0
}


# --------------------------------------------------
# Assign dimensions
# --------------------------------------------------

def assign_dimensions(room, config):

    base_ratio = ASPECT_RATIOS.get(room.room_type, 1.2)

    ratio = base_ratio * config.get("aspect_ratio_multiplier", 1.0)

    height = math.sqrt(room.target_area / ratio)
    width = room.target_area / height

    room.set_dimensions(width, height)


# --------------------------------------------------
# Packing logic
# --------------------------------------------------

def pack_rooms(boundary, rooms, config=None):

    if config is None:
        config = DEFAULT_CONFIG

    # assign dimensions
    for room in rooms:
        assign_dimensions(room, config)

    # sorting strategy
    if config["sort_strategy"] == "area_desc":
        rooms.sort(key=lambda r: r.area(), reverse=True)

    elif config["sort_strategy"] == "area_asc":
        rooms.sort(key=lambda r: r.area())

    elif config["sort_strategy"] == "none":
        pass

    # initialize packer
    packer = newPacker(rotation=config["rotation"])

    packer.add_bin(boundary.width, boundary.height)

    # add rectangles
    for idx, room in enumerate(rooms):
        packer.add_rect(room.width, room.height, idx)

    # pack
    packer.pack()

    # assign packed positions and actual dimensions (rectpack may have rotated a room)
    for rect in packer.rect_list():

        _, x, y, w, h, rid = rect

        rooms[rid].set_position(x, y)
        rooms[rid].set_dimensions(w, h)

    return rooms