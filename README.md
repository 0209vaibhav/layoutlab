# LayoutLab

This project implements a computational floor planning system that packs a program of rooms into a rectangular boundary.
It reads a room program from CSV, generates multiple packing variants, selects the best layout based on spatial efficiency, exports the result to JSON, and visualizes the layout in a web dashboard.

The workflow integrates **Rhino + Grasshopper + Python + Web visualization**, reflecting the type of geometry-driven systems used in housing design workflows.

---

# System Overview

The pipeline follows four main stages:

```
CSV Program
   ↓
Python Packing Engine
   ↓
Layout JSON Export
   ↓
Web Dashboard Visualization
```

The boundary can be defined either as a rectangle drawn in **Rhino** (referenced in Grasshopper) or directly inside **Grasshopper** using a rectangle component driven by sliders.
In both cases, the packing engine computes the layout dynamically whenever the boundary dimensions change.

---

## Quick Preview

1. Open `web/index.html` in a browser.
2. The viewer first attempts to load `exports/layout.json`; if none is found, it falls back to a sample layout (`web/demo_layout.json`).
3. To generate a new layout, run the solver in **Rhino + Grasshopper** so it writes `exports/layout.json`, then refresh the browser.

---

## Example Layout

![Floor Planner Dashboard](docs/screenshot.png)

---

## Key Features

- CSV-driven room program
- Rectangle packing solver using **rectpack**
- Multi-variant layout evaluation
- Program profiles (compact, balanced, generous)
- Automatic area metrics
- JSON-based layout schema
- Interactive web dashboard
- Rhino + Grasshopper integration

---

# Detailed Features

### Room Packing Engine

Rooms are packed inside a rectangular boundary using a **rectangle bin packing algorithm**.

The system evaluates multiple solver variants and selects the most efficient layout.

Variants include:

* Rotation enabled / disabled
* Sorting strategies for packing order
* Multiple program sizing profiles

---

### Program Profiles

Rooms can vary between their **minimum area and target area** defined in the CSV.

Three program presets are tested:

* **Compact** — rooms closer to minimum area
* **Balanced** — mid-range sizing
* **Generous** — rooms closer to target area

This allows the solver to evaluate different spatial densities.

---

### Multi-Variant Solver

The system evaluates multiple packing strategies:

```
3 program profiles
×
4 packing strategies
=
12 layout variants
```

Each variant is evaluated using **packing efficiency**, and the best-performing layout is exported.

Solver metadata is included in the JSON output for transparency.

---

### Area Metrics

The system computes spatial metrics derived from geometry:

| Metric             | Description                           |
| ------------------ | ------------------------------------- |
| Gross Floor Area   | Boundary width × height               |
| Net Floor Area     | Sum of room areas                     |
| Private Area       | Sum of rooms where category = private |
| Common Area        | Sum of rooms where category = common  |
| Packing Efficiency | Net area ÷ Gross area                 |
| Private Ratio      | Private area ÷ Net area               |
| Common Ratio       | Common area ÷ Net area                |

These metrics are exported to JSON and displayed in the dashboard.

---

# Project Architecture

The project follows a modular architecture separating **models, services, and interfaces**.

```
cedar-floor-planner

data/
   room_program.csv

exports/
   layout.json (generated)

gh/
   main.py

   models/
       room.py
       boundary.py
       layout.py

   services/
       csv_loader.py
       packing_engine.py
       exporter.py

grasshopper/
   cedar_floor_planner.gh

web/
   index.html
   style.css
   app.js

README.md
schema.md
requirements.txt
.gitignore
```

---

# Core Components

### Models

```
Room
Boundary
Layout
```

These represent the geometric and programmatic entities in the system.

---

### Services

Services implement the main system logic.

```
csv_loader.py
```

Reads the room program from CSV.

```
packing_engine.py
```

Runs the packing algorithm using **rectpack**.

```
exporter.py
```

Converts the layout into a structured JSON format.

---

### Grasshopper Integration

Grasshopper acts as the **geometry interface**, and supports two boundary workflows:

- **Option A – Rhino‑driven boundary**
  1. User draws a rectangular boundary in Rhino.
  2. Grasshopper references this rectangle and extracts its dimensions.
  3. The Python solver packs rooms inside the referenced boundary.

- **Option B – Grasshopper‑driven boundary**
  1. A Grasshopper rectangle component defines the boundary.
  2. Boundary width/height are controlled directly via sliders in Grasshopper (no Rhino rectangle required).

In both cases, the solver exports `exports/layout.json`, and the web viewer reads that JSON to update automatically.

---

### Web Dashboard

The web interface reads the exported JSON and renders:

* floor plan layout
* room labels
* color-coded program types
* spatial metrics
* solver decisions

The dashboard is **fully driven by the JSON output**.

---

# Technologies Used

| Tool                   | Purpose                            |
| ---------------------- | ---------------------------------- |
| Rhino 8                | Boundary geometry                  |
| Grasshopper + GhPython | Solver interface                   |
| Python                 | Packing engine and data processing |
| rectpack               | Rectangle packing algorithm        |
| JavaScript             | Layout visualization               |
| Git                    | Version control                    |

---

# How to Run

## 1. Install Python Dependencies

Install the required Python package inside Rhino's Python environment:

```bash
pip install -r requirements.txt
```

The project currently requires:

- rectpack (rectangle packing library)

---

### 2. Launch Rhino + Grasshopper

1. Open Rhino.
2. Load the Grasshopper definition.
3. Choose one of the boundary workflows:
   - Draw a rectangular boundary in Rhino and reference it in Grasshopper, **or**
   - Use the built‑in Grasshopper rectangle component and control its dimensions via sliders.

---

### 3. Run Solver

Grasshopper executes the Python solver which:

1. Reads `room_program.csv`.
2. Packs the rooms inside the current boundary (from Rhino or Grasshopper).
3. Computes metrics.
4. Exports `exports/layout.json`.

---

### 4. Launch Web Dashboard

Open:

```
web/index.html
```

The dashboard reads `exports/layout.json` if present, and otherwise falls back to `web/demo_layout.json`, then visualizes the layout.

---

# Design Decisions

### Rectangular Room Model

Rooms are modeled as axis-aligned rectangles to simplify packing and ensure efficient computation.

---

### JSON-Driven Visualization

The web viewer reconstructs the layout directly from JSON.
This ensures the visualization layer remains completely decoupled from the solver.

---

### Multi-Variant Solver

Evaluating multiple packing strategies improves layout robustness and demonstrates solver exploration rather than a single deterministic output.

---

# Possible Extensions

Future improvements could include:

* adjacency constraints between rooms
* corridor generation
* irregular boundary support
* multi-floor stacking
* 3D visualization

---

# AI-Assisted Development

AI was used extensively throughout this project for **briefing, iteration, and refinement**.
I first used ChatGPT to digest the brief PDF shared by the Cedar team, clarify requirements, map out the end‑to‑end workflow, and generate step‑by‑step implementation plans.
ChatGPT also supported debugging, refactoring, data‑schema design, and early UI/UX and visualization ideas for the web dashboard.
Later in the process, I used Cursor’s AI capabilities primarily for **fast, minimal web UI/UX changes** and small code edits while keeping the overall architecture and design decisions under my own control.
All final code and documentation were reviewed and adjusted manually to ensure they matched the intended behavior and design goals.

---

# Author

Vaibhav Jain
