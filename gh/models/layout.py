"""
Layout model representing a full floor plan.
"""

class Layout:
    def __init__(self, boundary, rooms):
        self.boundary = boundary
        self.rooms = rooms  # List of Room objects

    def net_floor_area(self):
        """Sum of all room areas."""
        return sum(room.area() for room in self.rooms)

    def private_area(self):
        """Sum of areas where category = private."""
        return sum(room.area() for room in self.rooms if room.category == "private")

    def common_area(self):
        """Sum of areas where category = common."""
        return sum(room.area() for room in self.rooms if room.category == "common")

    def packing_efficiency(self):
        """Net / Gross."""
        gross = self.boundary.area()
        if gross == 0:
            return 0
        return self.net_floor_area() / gross

    def to_dict(self):
        """Convert full layout to dictionary for JSON export."""
        return {
            "boundary": self.boundary.to_dict(),
            "rooms": [room.to_dict() for room in self.rooms],
            "metrics": {
                "gross_floor_area": self.boundary.area(),
                "net_floor_area": self.net_floor_area(),
                "private_area": self.private_area(),
                "common_area": self.common_area(),
                "packing_efficiency": self.packing_efficiency()
            }
        }