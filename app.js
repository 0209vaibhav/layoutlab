const tooltip = document.getElementById("tooltip");
const svgElement = document.getElementById("floorplan");
const canvasPanel = document.querySelector(".canvas-panel");

let viewScale = 1;
let viewTranslateX = 0;
let viewTranslateY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panOriginX = 0;
let panOriginY = 0;
let currentLayoutData = null;
let compareMode = false;
let compareSelection = [];
let originalCanvasHTML = null;

// ---------------------------
// Tooltip
// ---------------------------

function showTooltip(html, event) {
    tooltip.innerHTML = html;
    tooltip.style.opacity = 1;
    moveTooltip(event);
}

function moveTooltip(event) {
    tooltip.style.left = event.pageX + 12 + "px";
    tooltip.style.top = event.pageY + 12 + "px";
}

function hideTooltip() {
    tooltip.style.opacity = 0;
}

// ---------------------------
// View Transform
// ---------------------------

function applyViewTransform() {
    const groups = document.querySelectorAll("g[id='floorplan-group']");
    groups.forEach(group => {
        group.setAttribute(
            "transform",
            `translate(${viewTranslateX}, ${viewTranslateY}) scale(${viewScale})`
        );
    });
}

function resetView() {
    viewScale = 1;
    viewTranslateX = 0;
    viewTranslateY = 0;
    applyViewTransform();
}

function zoomBy(factor, event) {
    let cx, cy;
    if (event && event.rect) {
        cx = event.clientX;
        cy = event.clientY;
    } else {
        const svg = document.querySelector("svg");
        const rect = svg.getBoundingClientRect();
        cx = rect.width / 2;
        cy = rect.height / 2;
    }
    const svgX = (cx - viewTranslateX) / viewScale;
    const svgY = (cy - viewTranslateY) / viewScale;
    const newScale = Math.min(4, Math.max(0.4, viewScale * factor));
    viewTranslateX = cx - svgX * newScale;
    viewTranslateY = cy - svgY * newScale;
    viewScale = newScale;
    applyViewTransform();
}

// ---------------------------
// Canvas interactions
// ---------------------------

function setupCanvasInteractions() {
    if (!svgElement) return;

    document.getElementById("zoom-in").addEventListener("click", () => zoomBy(1.2));
    document.getElementById("zoom-out").addEventListener("click", () => zoomBy(1 / 1.2));
    document.getElementById("recenter").addEventListener("click", resetView);

    canvasPanel.addEventListener("wheel", (event) => {
        event.preventDefault();
        const svg = event.target.closest("svg");
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;
        const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        zoomBy(factor, { clientX: cx, clientY: cy, rect });
    }, { passive: false });

    canvasPanel.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        isPanning = true;
        panStartX = event.clientX;
        panStartY = event.clientY;
        panOriginX = viewTranslateX;
        panOriginY = viewTranslateY;
    });

    window.addEventListener("mousemove", (event) => {
        if (!isPanning) return;
        viewTranslateX = panOriginX + (event.clientX - panStartX);
        viewTranslateY = panOriginY + (event.clientY - panStartY);
        applyViewTransform();
    });

    window.addEventListener("mouseup", () => { isPanning = false; });

    window.addEventListener("keydown", (event) => {
        const step = 20;
        if (event.key === "+" || event.key === "=") zoomBy(1.1);
        else if (event.key === "-") zoomBy(1 / 1.1);
        else if (event.key === "ArrowUp") { viewTranslateY += step; applyViewTransform(); }
        else if (event.key === "ArrowDown") { viewTranslateY -= step; applyViewTransform(); }
        else if (event.key === "ArrowLeft") { viewTranslateX += step; applyViewTransform(); }
        else if (event.key === "ArrowRight") { viewTranslateX -= step; applyViewTransform(); }
        else if (event.key === "0" || event.key.toLowerCase() === "r") resetView();
    });
}

// ---------------------------
// Legend interactions
// ---------------------------

function setupLegendInteractions() {
    const rows = document.querySelectorAll(".legend-row[data-category]");

    function clearLegendHighlight() {
        document.querySelectorAll(".room").forEach(room => {
            room.classList.remove("dimmed");
            room.classList.remove("highlighted");
        });
    }

    rows.forEach(row => {
        const category = row.dataset.category;
        row.addEventListener("mouseenter", () => {
            document.querySelectorAll(".room").forEach(room => {
                if (room.classList.contains(category)) {
                    room.classList.add("highlighted");
                    room.classList.remove("dimmed");
                } else {
                    room.classList.add("dimmed");
                    room.classList.remove("highlighted");
                }
            });
        });
        row.addEventListener("mouseleave", clearLegendHighlight);
    });
}

// ---------------------------
// Slider setup
// ---------------------------

function initBoundarySlider(inputId, valId, fillId, min, max) {
    const sl = document.getElementById(inputId);
    const valEl = document.getElementById(valId);
    const fill = document.getElementById(fillId);

    function update() {
        const pct = (parseInt(sl.value) - min) / (max - min) * 100;
        fill.style.width = pct + "%";
        valEl.textContent = sl.value + " m";
    }

    sl.addEventListener("input", update);
    update();
}

function initDualSlider(roomId, minInputId, maxInputId, min, max) {
    const minSl = document.getElementById(minInputId);
    const maxSl = document.getElementById(maxInputId);
    const fill  = document.getElementById(`${roomId}-fill`);
    const loEl  = document.getElementById(`${roomId}-lo`);
    const hiEl  = document.getElementById(`${roomId}-hi`);

    function update(moved) {
        let lo = parseInt(minSl.value);
        let hi = parseInt(maxSl.value);
        if (lo > hi) {
            if (moved === "min") { minSl.value = hi; lo = hi; }
            else { maxSl.value = lo; hi = lo; }
        }
        const range = max - min;
        fill.style.left  = ((lo - min) / range * 100) + "%";
        fill.style.width = ((hi - lo) / range * 100) + "%";
        loEl.textContent = lo;
        hiEl.textContent = hi;
        if (hi >= max - 1) {
            minSl.style.zIndex = 5;
            maxSl.style.zIndex = 4;
        } else {
            minSl.style.zIndex = 4;
            maxSl.style.zIndex = 5;
        }
    }

    minSl.addEventListener("input", () => update("min"));
    maxSl.addEventListener("input", () => update("max"));
    update(null);
}

function setupSliders() {
    initBoundarySlider("boundary-width",  "bw-val", "bw-fill", 5, 50);
    initBoundarySlider("boundary-height", "bh-val", "bh-fill", 5, 50);

    initDualSlider("living_room",  "living-min",    "living-target",    15, 50);
    initDualSlider("kitchen",      "kitchen-min",   "kitchen-target",   5,  30);
    initDualSlider("bedroom_1",    "bedroom1-min",  "bedroom1-target",  8,  30);
    initDualSlider("bedroom_2",    "bedroom2-min",  "bedroom2-target",  8,  30);
    initDualSlider("bathroom_1",   "bathroom1-min", "bathroom1-target", 2,  15);
    initDualSlider("bathroom_2",   "bathroom2-min", "bathroom2-target", 2,  15);
    initDualSlider("circulation",  "circulation-min","circulation-target", 3, 20);
}

// ---------------------------
// Compare toggle
// ---------------------------

const compareToggle = document.getElementById("compare-toggle");

compareToggle.addEventListener("click", () => {
    compareMode = !compareMode;
    compareToggle.classList.toggle("active", compareMode);
    compareSelection = [];

    document.querySelectorAll(".variant-thumb").forEach(v => {
        v.classList.remove("selected");
        v.classList.remove("compare-selected");
    });

    if (!compareMode && currentLayoutData) {
        const container = document.getElementById("canvas-container");
        if (originalCanvasHTML) {
            container.innerHTML = originalCanvasHTML;
        } else {
            resetSingleLayout();
        }
        resetView();

        const best = currentLayoutData.variants[0];
        const firstVariant = document.querySelector(".variant-thumb");
        if (firstVariant) firstVariant.classList.add("compare-selected");

        renderLayout({ boundary: currentLayoutData.boundary, rooms: best.rooms });

        const metricsContainer = document.getElementById("metrics-container");
        metricsContainer.innerHTML = "";
        renderMetrics({
            boundary: currentLayoutData.boundary,
            metrics: best.metrics,
            solver: {
                selected_profile: best.profile,
                rotation: best.rotation,
                sort_strategy: best.sort_strategy,
                variants_tested: currentLayoutData.variants.length
            },
            variant_index: 1
        }, metricsContainer);
    }
});

// ---------------------------
// Render variants
// ---------------------------

function renderVariants(data) {
    const container = document.getElementById("variant-grid");
    if (!data.variants) return;

    const variants = [...data.variants];
    variants.sort((a, b) => b.efficiency - a.efficiency);
    container.innerHTML = "";

    variants.forEach((variant, index) => {
        variant.originalIndex = index + 1;

        const div = document.createElement("div");
        div.classList.add("variant-thumb");
        if (index === 0) div.classList.add("compare-selected");

        const thumbWidth = 160;
        const thumbHeight = 100;
        const scale = Math.min(thumbWidth / data.boundary.width, thumbHeight / data.boundary.height);

        let roomsSvg = "";
        variant.rooms.forEach(room => {
            const x = room.geometry.origin.x * scale;
            const y = room.geometry.origin.y * scale;
            const w = room.geometry.width * scale;
            const h = room.geometry.height * scale;
            const color = room.category === "common" ? "#6fbf73" : "#5fa4e8";
            roomsSvg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="#333" stroke-width="0.5"/>`;
        });

        div.innerHTML = `
            <div class="variant-rank">
                #${variant.originalIndex}
                ${index === 0 ? `<span class="best-star" title="Best performing layout">★</span>` : ""}
            </div>
            <svg width="${thumbWidth}" height="${thumbHeight}">${roomsSvg}</svg>
            <div class="variant-eff">Eff ${(variant.efficiency * 100).toFixed(1)}%</div>
        `;

        div.addEventListener("click", () => {
            if (!compareMode) {
                document.querySelectorAll(".variant-thumb").forEach(v => {
                    v.classList.remove("selected");
                    v.classList.remove("compare-selected");
                });
                div.classList.add("compare-selected");

                renderLayout({ boundary: data.boundary, rooms: variant.rooms });

                const metricsContainer = document.getElementById("metrics-container");
                metricsContainer.innerHTML = "";
                renderMetrics({
                    boundary: data.boundary,
                    metrics: variant.metrics,
                    solver: {
                        selected_profile: variant.profile,
                        rotation: variant.rotation,
                        sort_strategy: variant.sort_strategy,
                        variants_tested: data.variants.length
                    },
                    variant_index: variant.originalIndex
                }, metricsContainer);

            } else {
                if (compareSelection.length < 2) {
                    compareSelection.push(variant);
                    div.classList.add("selected");
                }
                if (compareSelection.length === 2) {
                    renderComparison(data.boundary, compareSelection);
                }
            }
        });

        container.appendChild(div);
    });
}

// ---------------------------
// Populate parameters from API response
// ---------------------------

function populateParameters(data) {
    const best = data.variants[0];

    // Update boundary sliders
    const bwSl = document.getElementById("boundary-width");
    const bhSl = document.getElementById("boundary-height");
    bwSl.value = data.boundary.width;
    bhSl.value = data.boundary.height;
    document.getElementById("bw-val").textContent = data.boundary.width + " m";
    document.getElementById("bh-val").textContent = data.boundary.height + " m";
    const bwPct = (data.boundary.width - 5) / (50 - 5) * 100;
    const bhPct = (data.boundary.height - 5) / (50 - 5) * 100;
    document.getElementById("bw-fill").style.width = bwPct + "%";
    document.getElementById("bh-fill").style.width = bhPct + "%";

    // Map room names to slider IDs
    const sliderMap = {
        living_room:  { id: "living_room",  minInput: "living-min",    maxInput: "living-target",    min: 15, max: 50 },
        kitchen:      { id: "kitchen",      minInput: "kitchen-min",   maxInput: "kitchen-target",   min: 5,  max: 30 },
        bedroom_1:    { id: "bedroom_1",    minInput: "bedroom1-min",  maxInput: "bedroom1-target",  min: 8,  max: 30 },
        bedroom_2:    { id: "bedroom_2",    minInput: "bedroom2-min",  maxInput: "bedroom2-target",  min: 8,  max: 30 },
        bathroom_1:   { id: "bathroom_1",   minInput: "bathroom1-min", maxInput: "bathroom1-target", min: 2,  max: 15 },
        bathroom_2:   { id: "bathroom_2",   minInput: "bathroom2-min", maxInput: "bathroom2-target", min: 2,  max: 15 },
        circulation:  { id: "circulation",  minInput: "circulation-min", maxInput: "circulation-target", min: 3, max: 20 }
    };

    best.rooms.forEach(room => {
        const cfg = sliderMap[room.name];
        if (!cfg) return;

        const minSl = document.getElementById(cfg.minInput);
        const maxSl = document.getElementById(cfg.maxInput);
        const fill  = document.getElementById(`${cfg.id}-fill`);
        const loEl  = document.getElementById(`${cfg.id}-lo`);
        const hiEl  = document.getElementById(`${cfg.id}-hi`);

        const lo = Math.min(Math.max(room.minimum_area, cfg.min), cfg.max);
        const hi = Math.min(Math.max(room.target_area,  cfg.min), cfg.max);

        minSl.value = lo;
        maxSl.value = hi;

        const range = cfg.max - cfg.min;
        fill.style.left  = ((lo - cfg.min) / range * 100) + "%";
        fill.style.width = ((hi - lo) / range * 100) + "%";
        loEl.textContent = lo;
        hiEl.textContent = hi;
    });
}

// ---------------------------
// Load layout on startup
// ---------------------------

async function loadLayout() {
    const defaultParams = {
        boundary: {
            width:  parseFloat(document.getElementById("boundary-width").value)  || 15,
            height: parseFloat(document.getElementById("boundary-height").value) || 10
        },
        program: {}
    };
    await generateLayout(defaultParams);
}

// ---------------------------
// Render layout
// ---------------------------

function renderLayout(data, svgOverride = null) {
    requestAnimationFrame(() => { _renderLayout(data, svgOverride); });
}

function _renderLayout(data, svgOverride = null) {
    const svg = svgOverride || document.getElementById("floorplan");
    if (!svg) return;

    svg.innerHTML = "";

    const boundaryWidth  = data.boundary.width;
    const boundaryHeight = data.boundary.height;
    const container = svg.parentElement;
    const svgWidth  = container.clientWidth;
    const svgHeight = container.clientHeight;

    svg.setAttribute("width",  svgWidth);
    svg.setAttribute("height", svgHeight);

    const padding = 40;
    const scale = Math.min((svgWidth - padding) / boundaryWidth, (svgHeight - padding) / boundaryHeight);
    const layoutWidth  = boundaryWidth  * scale;
    const layoutHeight = boundaryHeight * scale;
    const offsetX = (svgWidth  - layoutWidth)  * 0.5;
    const offsetY = (svgHeight - layoutHeight) * 0.5;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("id", "floorplan-group");

    const boundaryRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    boundaryRect.setAttribute("x", offsetX);
    boundaryRect.setAttribute("y", offsetY);
    boundaryRect.setAttribute("width",  boundaryWidth  * scale);
    boundaryRect.setAttribute("height", boundaryHeight * scale);
    boundaryRect.setAttribute("fill",   "none");
    boundaryRect.setAttribute("stroke", "black");
    boundaryRect.setAttribute("stroke-width", 2);
    group.appendChild(boundaryRect);

    data.rooms.forEach(room => {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x",      offsetX + room.geometry.origin.x * scale);
        rect.setAttribute("y",      offsetY + room.geometry.origin.y * scale);
        rect.setAttribute("width",  room.geometry.width  * scale);
        rect.setAttribute("height", room.geometry.height * scale);
        rect.classList.add("room");
        rect.classList.add(room.category);

        rect.addEventListener("mouseover", (event) => {
            showTooltip(`
                <strong>${room.name}</strong>
                <hr>
                Width: ${room.geometry.width.toFixed(2)} m<br>
                Height: ${room.geometry.height.toFixed(2)} m<br><br>
                Area: ${room.computed_area} m²<br>
                Target area: ${room.target_area} m²<br>
                Minimum area: ${room.minimum_area} m²<br>
            `, event);
        });
        rect.addEventListener("mousemove", moveTooltip);
        rect.addEventListener("mouseout",  hideTooltip);
        group.appendChild(rect);

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", offsetX + room.geometry.origin.x * scale + (room.geometry.width  * scale) / 2);
        label.setAttribute("y", offsetY + room.geometry.origin.y * scale + (room.geometry.height * scale) / 2);
        label.setAttribute("text-anchor",      "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("font-size",   "11");
        label.setAttribute("font-weight", "500");
        label.setAttribute("fill",        "#222");
        label.setAttribute("pointer-events", "none");
        label.textContent = room.name;
        group.appendChild(label);
    });

    svg.appendChild(group);

    if (!compareMode) applyViewTransform();
}

function resetSingleLayout() {
    const container = document.getElementById("canvas-container");
    container.innerHTML = `<svg id="floorplan"></svg>`;
    resetView();
}

// ---------------------------
// Render comparison
// ---------------------------

function renderComparison(boundary, variants) {
    resetView();

    const container = document.getElementById("canvas-container");
    if (!originalCanvasHTML) originalCanvasHTML = container.innerHTML;
    container.innerHTML = "";

    const metricsContainer = document.getElementById("metrics-container");
    metricsContainer.innerHTML = "";

    variants.forEach((variant) => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("compare-wrapper");

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add("compare-canvas");
        wrapper.appendChild(svg);
        container.appendChild(wrapper);

        requestAnimationFrame(() => {
            viewScale = 1;
            viewTranslateX = 0;
            viewTranslateY = 0;
            renderLayout({ boundary, rooms: variant.rooms }, svg);
        });

        renderMetrics({
            boundary,
            metrics: variant.metrics,
            solver: {
                selected_profile: variant.profile,
                rotation: variant.rotation,
                sort_strategy: variant.sort_strategy
            },
            variant_index: variant.originalIndex
        }, metricsContainer);
    });
}

// ---------------------------
// Render metrics
// ---------------------------

function renderMetrics(data, container) {
    const metrics = data.metrics;
    const solver  = data.solver;

    const div = document.createElement("div");
    div.classList.add("metrics-card");

    div.innerHTML = `
        <div class="metrics-title">Variant #${data.variant_index || ""}</div>
        <div class="metrics-grid">
            <div class="metric-card"><div class="metric-label">Efficiency</div><div class="metric-value">${(metrics.packing_efficiency * 100).toFixed(1)}%</div></div>
            <div class="metric-card"><div class="metric-label">Width</div><div class="metric-value">${data.boundary.width.toFixed(1)} m</div></div>
            <div class="metric-card"><div class="metric-label">Height</div><div class="metric-value">${data.boundary.height.toFixed(1)} m</div></div>
            <div class="metric-card"><div class="metric-label">Gross Area</div><div class="metric-value">${metrics.gross_floor_area.toFixed(1)} m²</div></div>
            <div class="metric-card"><div class="metric-label">Net Area</div><div class="metric-value">${metrics.net_floor_area.toFixed(1)} m²</div></div>
            <div class="metric-card"><div class="metric-label">Private</div><div class="metric-value">${metrics.private_area.toFixed(1)} m²</div></div>
            <div class="metric-card"><div class="metric-label">Common</div><div class="metric-value">${metrics.common_area.toFixed(1)} m²</div></div>
            <div class="metric-card"><div class="metric-label">Private Ratio</div><div class="metric-value">${(metrics.private_ratio * 100).toFixed(1)}%</div></div>
            <div class="metric-card"><div class="metric-label">Common Ratio</div><div class="metric-value">${(metrics.common_ratio * 100).toFixed(1)}%</div></div>
            <div class="metric-card"><div class="metric-label">Profile</div><div class="metric-value">${solver.selected_profile}</div></div>
            <div class="metric-card"><div class="metric-label">Rotation</div><div class="metric-value">${solver.rotation}</div></div>
            <div class="metric-card"><div class="metric-label">Sort</div><div class="metric-value">${solver.sort_strategy}</div></div>
        </div>
    `;

    container.appendChild(div);
}

// ---------------------------
// Parameter controls (sliders → API)
// ---------------------------

function setupParameterControls() {
    document.getElementById("generate-layout").addEventListener("click", async () => {

        const params = {
            boundary: {
                width:  parseFloat(document.getElementById("boundary-width").value)  || 15,
                height: parseFloat(document.getElementById("boundary-height").value) || 10
            },
            program: {
                living_room: {
                    target: parseFloat(document.getElementById("living-target").value) || null,
                    min:    parseFloat(document.getElementById("living-min").value)    || null
                },
                kitchen: {
                    target: parseFloat(document.getElementById("kitchen-target").value) || null,
                    min:    parseFloat(document.getElementById("kitchen-min").value)    || null
                },
                bedroom_1: {
                    target: parseFloat(document.getElementById("bedroom1-target").value) || null,
                    min:    parseFloat(document.getElementById("bedroom1-min").value)    || null
                },
                bedroom_2: {
                    target: parseFloat(document.getElementById("bedroom2-target").value) || null,
                    min:    parseFloat(document.getElementById("bedroom2-min").value)    || null
                },
                bathroom_1: {
                    target: parseFloat(document.getElementById("bathroom1-target").value) || null,
                    min:    parseFloat(document.getElementById("bathroom1-min").value)    || null
                },
                bathroom_2: {
                    target: parseFloat(document.getElementById("bathroom2-target").value) || null,
                    min:    parseFloat(document.getElementById("bathroom2-min").value)    || null
                },
                circulation: {
                    target: parseFloat(document.getElementById("circulation-target").value) || null,
                    min:    parseFloat(document.getElementById("circulation-min").value)    || null
                }
            }
        };

        await generateLayout(params);
    });
}

// ---------------------------
// Generate layout (API call)
// ---------------------------

async function generateLayout(params) {
    try {
        const response = await fetch("http://localhost:8000/generate-layout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params)
        });

        const data = await response.json();
        currentLayoutData = data;

        populateParameters(data);
        renderVariants(data);

        const best = data.variants[0];
        renderLayout({ boundary: data.boundary, rooms: best.rooms });

        const metricsContainer = document.getElementById("metrics-container");
        metricsContainer.innerHTML = "";
        renderMetrics({
            boundary: data.boundary,
            metrics: best.metrics,
            solver: {
                selected_profile: best.profile,
                rotation: best.rotation,
                sort_strategy: best.sort_strategy,
                variants_tested: data.variants.length
            },
            variant_index: 1
        }, metricsContainer);

    } catch (error) {
        console.error("Generate Layout Failed", error);
    }
}

// ---------------------------
// Tab switching
// ---------------------------

document.addEventListener("DOMContentLoaded", function () {
    const buttons = document.querySelectorAll(".tab-button");
    const panels  = document.querySelectorAll(".tab-panel");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const tab = button.getAttribute("data-tab");
            buttons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            panels.forEach(panel => panel.classList.remove("active"));
            const selected = document.getElementById(tab);
            if (selected) selected.classList.add("active");
        });
    });
});

window.addEventListener("resize", () => {
    if (currentLayoutData) renderLayout(currentLayoutData);
});

// ---------------------------
// Init
// ---------------------------

setupSliders();
setupCanvasInteractions();
setupLegendInteractions();
loadLayout();
setupParameterControls();
