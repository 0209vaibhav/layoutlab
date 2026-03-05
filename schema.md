# Floor Planner JSON Schema

This document describes the JSON structure exported by the floor planning system.
The goal of the schema is to fully describe the generated layout so that the floor plan can be reconstructed by any downstream application (such as the web dashboard).

The exported JSON contains four main sections:

* boundary
* rooms
* metrics
* solver

---

# 1. Boundary

The boundary describes the rectangular container in which rooms are packed.
In the Rhino + Grasshopper implementation this boundary can come from either:

- A rectangle drawn in Rhino and referenced into Grasshopper, or  
- A Grasshopper rectangle component driven by sliders.

Regardless of how it is created, the exported JSON only encodes the **width** and **height** of this rectangle; downstream tools do not need to know whether it originated in Rhino or Grasshopper.

```json
"boundary": {
    "width": 25.0,
    "height": 10.0
}
```

### Fields

| Field  | Type   | Description                      |
| ------ | ------ | -------------------------------- |
| width  | number | Width of the boundary rectangle  |
| height | number | Height of the boundary rectangle |

The gross floor area is derived as:

```
gross_floor_area = width × height
```

---

# 2. Rooms

Each room is exported with program information, computed geometry, and derived area.

```json
{
  "name": "living_room",
  "type": "living",
  "category": "common",
  "target_area": 25,
  "minimum_area": 20,
  "computed_area": 25,
  "geometry": {
      "origin": { "x": 0, "y": 0 },
      "width": 5,
      "height": 5,
      "corners": [
          { "x": 0, "y": 0 },
          { "x": 5, "y": 0 },
          { "x": 5, "y": 5 },
          { "x": 0, "y": 5 }
      ]
  }
}
```

### Fields

| Field         | Description                                   |
| ------------- | --------------------------------------------- |
| name          | Unique room identifier                        |
| type          | Program type (living, bedroom, kitchen, etc.) |
| category      | Spatial classification (private or common)    |
| target_area   | Desired program area                          |
| minimum_area  | Minimum acceptable program area               |
| computed_area | Final room area based on packed geometry      |
| geometry      | Spatial description of the room               |

---

# 3. Room Geometry

Room geometry describes the position and dimensions of each packed rectangle.

### Origin

```
origin = bottom-left corner of the room
```

### Dimensions

```
width = horizontal size
height = vertical size
```

### Corners

The four corners are included so that the room can be reconstructed directly as a polygon.

---

# 4. Metrics

Metrics summarize spatial performance of the generated layout.

```json
"metrics": {
  "gross_floor_area": 250,
  "net_floor_area": 80,
  "private_area": 35,
  "common_area": 45,
  "packing_efficiency": 0.32,
  "private_ratio": 0.44,
  "common_ratio": 0.56
}
```

### Metrics Definitions

| Metric             | Formula                               |
| ------------------ | ------------------------------------- |
| Gross Floor Area   | boundary width × boundary height      |
| Net Floor Area     | sum of all room areas                 |
| Private Area       | sum of rooms where category = private |
| Common Area        | sum of rooms where category = common  |
| Packing Efficiency | net floor area ÷ gross floor area     |
| Private Ratio      | private area ÷ net floor area         |
| Common Ratio       | common area ÷ net floor area          |

---

# 5. Solver Metadata

The solver section documents the decisions made by the layout engine.

```json
"solver": {
  "selected_profile": "generous",
  "rotation": false,
  "sort_strategy": "area_desc",
  "variants_tested": 12
}
```

### Fields

| Field            | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| selected_profile | Program sizing strategy used (compact, balanced, generous) |
| rotation         | Whether rectangle rotation was enabled                     |
| sort_strategy    | Packing order strategy                                     |
| variants_tested  | Total solver variants evaluated                            |

This metadata makes the solver behavior transparent and helps explain how the final layout was selected.

---

# Design Philosophy

The schema was designed so that:

1. The floor plan can be **reconstructed entirely from JSON**.
2. Program requirements remain **traceable from CSV input to geometry output**.
3. Solver decisions remain **transparent for debugging and comparison**.
