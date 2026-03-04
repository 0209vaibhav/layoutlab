"""
Boundary model representing the floor plan container.
"""

class Boundary:
    def __init__(self, width, height):
        self.width = float(width)
        self.height = float(height)

    def area(self):
        """Compute gross floor area."""
        return self.width * self.height

    def to_dict(self):
        """Convert boundary to dictionary for JSON export."""
        return {
            "width": self.width,
            "height": self.height,
            "area": self.area()
        }