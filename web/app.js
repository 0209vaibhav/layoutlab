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

function applyViewTransform() {

    const groups = document.querySelectorAll("#floorplan-group");

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

    if (!compareMode) {
        applyViewTransform();
    }
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

function setupCanvasInteractions() {

    const canvasPanel = document.querySelector(".canvas-panel");

    if (!svgElement) return;

    // Buttons
    document.getElementById("zoom-in").addEventListener("click", () => zoomBy(1.2));
    document.getElementById("zoom-out").addEventListener("click", () => zoomBy(1 / 1.2));
    document.getElementById("recenter").addEventListener("click", resetView);

    // Mouse wheel zoom
    document.querySelectorAll("svg").forEach(svg => {

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
    
    });

    // Mouse drag pan
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

        const dx = event.clientX - panStartX;
        const dy = event.clientY - panStartY;

        viewTranslateX = panOriginX + dx;
        viewTranslateY = panOriginY + dy;
        applyViewTransform();

    });

    window.addEventListener("mouseup", () => {

        isPanning = false;

    });

    // Keyboard controls
    window.addEventListener("keydown", (event) => {

        const step = 20;

        if (event.key === "+" || event.key === "=") {
            zoomBy(1.1);
        } else if (event.key === "-") {
            zoomBy(1 / 1.1);
        } else if (event.key === "ArrowUp") {
            viewTranslateY += step;
            applyViewTransform();
        } else if (event.key === "ArrowDown") {
            viewTranslateY -= step;
            applyViewTransform();
        } else if (event.key === "ArrowLeft") {
            viewTranslateX += step;
            applyViewTransform();
        } else if (event.key === "ArrowRight") {
            viewTranslateX -= step;
            applyViewTransform();
        } else if (event.key === "0" || event.key.toLowerCase() === "r") {
            resetView();
        }

    });

}

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

            const rooms = document.querySelectorAll(".room");

            rooms.forEach(room => {

                if (room.classList.contains(category)) {
                    room.classList.add("highlighted");
                    room.classList.remove("dimmed");
                } else {
                    room.classList.add("dimmed");
                    room.classList.remove("highlighted");
                }

            });

        });

        row.addEventListener("mouseleave", () => {

            clearLegendHighlight();

        });

    });

}

document.getElementById("compare-toggle").addEventListener("click", () => {

    compareMode = !compareMode;
    compareSelection = [];

    resetView();

    // clear all variant highlights
    document.querySelectorAll(".variant-thumb").forEach(v => {
        v.classList.remove("selected");
        v.classList.remove("compare-selected");
    });

});

function renderVariants(data) {

    const container = document.getElementById("variant-grid");

    if (!data.variants) return;

    const variants = [...data.variants];

    // Sort by efficiency (best first)
    variants.sort((a, b) => b.efficiency - a.efficiency);

    container.innerHTML = "";

    variants.forEach((variant, index) => {

        const div = document.createElement("div");
        div.classList.add("variant-thumb");
        
        if (index === 0) {
            div.classList.add("compare-selected");
        }

        const thumbWidth = 160;
        const thumbHeight = 100;
        const scale = Math.min(
            thumbWidth / data.boundary.width,
            thumbHeight / data.boundary.height
        );
        
        let roomsSvg = "";
        
        variant.rooms.forEach(room => {
        
            const x = room.geometry.origin.x * scale;
            const y = room.geometry.origin.y * scale;
            const w = room.geometry.width * scale;
            const h = room.geometry.height * scale;
        
            const color = room.category === "common"
                ? "#6fbf73"
                : "#5fa4e8";
        
            roomsSvg += `
                <rect
                    x="${x}"
                    y="${y}"
                    width="${w}"
                    height="${h}"
                    fill="${color}"
                    stroke="#333"
                    stroke-width="0.5"
                />
            `;
        });
        
        div.innerHTML = `
        <div class="variant-rank">
            #${index + 1}
            ${index === 0 ? `<span class="best-star" title="Best performing layout">★</span>` : ``}
        </div>
        
        <svg width="${thumbWidth}" height="${thumbHeight}">
            ${roomsSvg}
        </svg>
        
        <div class="variant-eff">
            Eff ${(variant.efficiency * 100).toFixed(1)}%
        </div>
        `;

        div.addEventListener("click", () => {

            if (!compareMode) {
        
                renderLayout({
                    boundary: data.boundary,
                    rooms: variant.rooms
                });
        
                const metricsContainer = document.getElementById("metrics-container");
                metricsContainer.innerHTML = "";
                
                renderMetrics({
                    boundary: data.boundary,
                    metrics: variant.metrics,
                    solver: {                         selected_profile: variant.profile,
                        rotation: variant.rotation,
                        sort_strategy: variant.sort_strategy,
                        variants_tested: data.variants.length},
                    variant_index: index + 1
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

async function loadLayout() {

    let data;

    try {

        const response = await fetch("../exports/layout.json");

        if (!response.ok) {
            throw new Error("Live layout not available");
        }

        data = await response.json();

    } catch (error) {

        console.log("Loading demo layout...");

        const response = await fetch("demo_layout.json");
        data = await response.json();

    }

    renderVariants(data);

    const variantsSorted = [...data.variants].sort((a,b)=>b.efficiency-a.efficiency);

    const best = variantsSorted[0];

    const metricsContainer = document.getElementById("metrics-container");
    metricsContainer.innerHTML = "";
    
    renderLayout({
        boundary: data.boundary,
        rooms: best.rooms
    });
    
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

}

function renderLayout(data, svgOverride = null) {

    requestAnimationFrame(() => {

        _renderLayout(data, svgOverride);

    });
}


function _renderLayout(data, svgOverride = null) {

    currentLayoutData = data;

    const svg = svgOverride || document.getElementById("floorplan");
    if (!svg) return;

    svg.innerHTML = "";

    const boundaryWidth = data.boundary.width;
    const boundaryHeight = data.boundary.height;

    const container = svg.parentElement;

    const svgWidth = container.clientWidth;
    const svgHeight = container.clientHeight;

    // ✅ Apply size (JS controls, not CSS)
    svg.setAttribute("width", svgWidth);
    svg.setAttribute("height", svgHeight);

    // 🔹 Auto-fit scale
    const padding = 40;

    const scaleX = (svgWidth - padding) / boundaryWidth;
    const scaleY = (svgHeight - padding) / boundaryHeight;

    const scale = Math.min(scaleX, scaleY);

    // 🔹 Center layout
    const layoutWidth = boundaryWidth * scale;
    const layoutHeight = boundaryHeight * scale;

    const offsetX = (svgWidth - layoutWidth) * 0.5;
    const offsetY = (svgHeight - layoutHeight) * 0.5;

    // 🔹 Create group
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("id", "floorplan-group");

    // 🔹 Boundary
    const boundaryRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    boundaryRect.setAttribute("x", offsetX);
    boundaryRect.setAttribute("y", offsetY);
    boundaryRect.setAttribute("width", boundaryWidth * scale);
    boundaryRect.setAttribute("height", boundaryHeight * scale);

    boundaryRect.setAttribute("fill", "none");
    boundaryRect.setAttribute("stroke", "black");
    boundaryRect.setAttribute("stroke-width", 2);

    group.appendChild(boundaryRect);

    // 🔹 Rooms
    data.rooms.forEach(room => {

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

        rect.setAttribute("x", offsetX + room.geometry.origin.x * scale);
        rect.setAttribute("y", offsetY + room.geometry.origin.y * scale);
        rect.setAttribute("width", room.geometry.width * scale);
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
        rect.addEventListener("mouseout", hideTooltip);

        group.appendChild(rect);

        // 🔹 Label
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");

        label.setAttribute(
            "x",
            offsetX + room.geometry.origin.x * scale + (room.geometry.width * scale) / 2
        );

        label.setAttribute(
            "y",
            offsetY + room.geometry.origin.y * scale + (room.geometry.height * scale) / 2
        );

        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("font-size", "11");
        label.setAttribute("font-weight", "500");
        label.setAttribute("fill", "#222");
        label.setAttribute("pointer-events", "none");

        label.textContent = room.name;

        group.appendChild(label);

    });

    svg.appendChild(group);

    // 🔥 Apply zoom ONLY in single mode
    if (!compareMode) {
        applyViewTransform();
    }
}
    
    function renderComparison(boundary, variants) {

        resetView();
    
        const container = document.getElementById("canvas-container");    
        container.innerHTML = "";

        const metricsContainer = document.getElementById("metrics-container");
        metricsContainer.innerHTML = "";
    
        variants.forEach((variant, i) => {
            variant.index = variant.index || (i + 1);
    
            const wrapper = document.createElement("div");
            wrapper.classList.add("compare-wrapper");
            
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add("compare-canvas");
            
            
            wrapper.appendChild(svg);
            container.appendChild(wrapper);
    
            requestAnimationFrame(() => {

                // 🔥 HARD RESET TRANSFORM (CRITICAL)
                viewScale = 1;
                viewTranslateX = 0;
                viewTranslateY = 0;
            
                renderLayout({
                    boundary: boundary,
                    rooms: variant.rooms
                }, svg);
            
            });

                renderMetrics({
                    boundary: boundary,
                    metrics: variant.metrics,
                    solver: {
                        selected_profile: variant.profile,
                        rotation: variant.rotation,
                        sort_strategy: variant.sort_strategy
                    },
                    variant_index: variant.index
                }, metricsContainer);
            
            });
    
        }
    
    function renderMetrics(data, container) {

        const metrics = data.metrics;
        const solver = data.solver;
    
        const div = document.createElement("div");
        div.classList.add("metrics-card");
    
        div.innerHTML = `

        <div class="metrics-title">
            Variant #${data.variant_index || ""} 
        </div>
    
        <div class="metrics-grid">
    
            <div class="metric-card">
                <div class="metric-label">Efficiency</div>
                <div class="metric-value">${(metrics.packing_efficiency * 100).toFixed(1)}%</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Width</div>
                <div class="metric-value">${data.boundary.width.toFixed(1)} m</div>
            </div>
    
            <div class="metric-card">
                <div class="metric-label">Height</div>
                <div class="metric-value">${data.boundary.height.toFixed(1)} m</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Gross Area</div>
                <div class="metric-value">${metrics.gross_floor_area.toFixed(1)} m²</div>
            </div>
    
            <div class="metric-card">
                <div class="metric-label">Net Area</div>
                <div class="metric-value">${metrics.net_floor_area.toFixed(1)} m²</div>
            </div>  
    
            <div class="metric-card">
                <div class="metric-label">Private</div>
                <div class="metric-value">${metrics.private_area.toFixed(1)} m²</div>
            </div>
    
            <div class="metric-card">
                <div class="metric-label">Common</div>
                <div class="metric-value">${metrics.common_area.toFixed(1)} m²</div>
            </div>
    
            <div class="metric-card">
                <div class="metric-label">Private Ratio</div>
                <div class="metric-value">${(metrics.private_ratio * 100).toFixed(1)}%</div>
            </div>
    
            <div class="metric-card">
                <div class="metric-label">Common Ratio</div>
                <div class="metric-value">${(metrics.common_ratio * 100).toFixed(1)}%</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Profile</div>
                <div class="metric-value">${solver.selected_profile}</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Rotation</div>
                <div class="metric-value">${solver.rotation}</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Sort</div>
                <div class="metric-value">${solver.sort_strategy}</div>
            </div>
        
        </div>
    
    `;
    
        container.appendChild(div);
    }

window.addEventListener("resize", () => {

    if (currentLayoutData) {
        renderLayout(currentLayoutData);
    }

});

setupCanvasInteractions();
setupLegendInteractions();
loadLayout();
