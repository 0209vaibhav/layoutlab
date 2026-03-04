"""
Packing engine using rectpack.
Assigns dimensions based on room type,
then packs them inside the boundary.
"""

import math
from rectpack import newPacker


# --- 1️⃣ Aspect Ratio Strategy (Option B) ---

ASPECT_RATIOS = {
    "living": 1.6,
    "kitchen": 1.3,
    "bedroom": 1.2,
    "bathroom": 0.9,
    "circulation": 2.0
}


def assign_dimensions(room):
    """
    Assign width & height based on room type and target area.
    """

    ratio = ASPECT_RATIOS.get(room.room_type, 1.2)

    # area = width * height
    # width / height = ratio

    height = math.sqrt(room.target_area / ratio)
    width = room.target_area / height

    room.set_dimensions(width, height)


# --- 2️⃣ Packing Logic ---

def pack_rooms(boundary, rooms):
    """
    Packs rooms into boundary using rectpack.
    """

    # First assign dimensions
    for room in rooms:
        assign_dimensions(room)

    # Sort rooms by area descending (better packing behavior)
    rooms.sort(key=lambda r: r.area(), reverse=True)

    packer = newPacker(rotation=False)

    # Add boundary as bin
    packer.add_bin(boundary.width, boundary.height)

    # Add rectangles
    for idx, room in enumerate(rooms):
        packer.add_rect(room.width, room.height, idx)

    # Execute packing
    packer.pack()

    # Assign positions back to rooms
    for rect in packer.rect_list():
        _, x, y, w, h, rid = rect
        rooms[rid].set_position(x, y)

    return rooms