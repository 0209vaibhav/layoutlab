"""
Room model representing a single program space.
"""

class Room:
    def __init__(self, name, room_type, category, target_area, min_area):
        self.name = name
        self.room_type = room_type
        self.category = category
        self.target_area = float(target_area)
        self.min_area = float(min_area)

        # These will be assigned during packing
        self.width = None
        self.height = None
        self.x = None
        self.y = None

    def set_dimensions(self, width, height):
        """Assign width and height after packing."""
        self.width = width
        self.height = height

    def set_position(self, x, y):
        """Assign position inside boundary."""
        self.x = x
        self.y = y

    def area(self):
        """Compute area from actual geometry dimensions."""
        if self.width and self.height:
            return self.width * self.height
        return 0

    def to_dict(self):
        """Convert room to dictionary for JSON export."""
        return {
            "name": self.name,
            "type": self.room_type,
            "category": self.category,
            "target_area": self.target_area,
            "min_area": self.min_area,
            "width": self.width,
            "height": self.height,
            "x": self.x,
            "y": self.y,
            "computed_area": self.area()
        }