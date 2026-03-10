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
        
                renderMetrics({
                    boundary: data.boundary,
                    metrics: variant.metrics,
                    solver: {
                        selected_profile: variant.profile,
                        rotation: variant.rotation,
                        sort_strategy: variant.sort_strategy,
                        variants_tested: data.variants.length
                    }
                });
        
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
        }
    });

}

function renderLayout(data, svgOverride = null) {
    currentLayoutData = data;
    const svg = svgOverride || document.getElementById("floorplan");
    if (!svg) return;

    // Clear previous render
    svg.innerHTML = "";

    const boundaryWidth = data.boundary.width;
    const boundaryHeight = data.boundary.height;

    const rect = svg.getBoundingClientRect();

    const svgWidth = rect.width;
    const svgHeight = rect.height;

    svg.setAttribute("width", svgWidth);
    svg.setAttribute("height", svgHeight);

    // Auto-fit scale so layout fits inside canvas

    const padding = 40;

    const scaleX = (svgWidth - padding) / boundaryWidth;
    const scaleY = (svgHeight - padding) / boundaryHeight;
    
    const scale = Math.min(scaleX, scaleY);

    // Center layout
    const offsetX = (svgWidth - boundaryWidth * scale) / 2;
    const offsetY = (svgHeight - boundaryHeight * scale) / 2;

    // Clear any existing group
    const existingGroup = svg.querySelector("#floorplan-group");
    if (existingGroup) {
        svg.removeChild(existingGroup);
    }

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("id", "floorplan-group");
    
    // Draw boundary
    const boundaryRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    boundaryRect.setAttribute("x", offsetX);
    boundaryRect.setAttribute("y", offsetY);
    boundaryRect.setAttribute("width", boundaryWidth * scale);
    boundaryRect.setAttribute("height", boundaryHeight * scale);

    boundaryRect.setAttribute("fill", "none");
    boundaryRect.setAttribute("stroke", "black");
    boundaryRect.setAttribute("stroke-width", 2);

    group.appendChild(boundaryRect);

    // Draw rooms
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
                Height: ${room.geometry.height.toFixed(2)} m
<br><br>
                Area: ${room.computed_area} m²<br>
                Target area: ${room.target_area} m²<br>
                Minimum area: ${room.minimum_area} m²<br>

            `, event);
        
        });
        
        rect.addEventListener("mousemove", moveTooltip);
        
        rect.addEventListener("mouseout", () => {

            hideTooltip();
        
        });

        group.appendChild(rect);

        // Room label
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
    applyViewTransform();
    
    }
    
    function renderComparison(boundary, variants) {

        resetView();
    
        const container = document.getElementById("canvas-container");
    
        container.innerHTML = "";
    
        variants.forEach((variant) => {
    
            const wrapper = document.createElement("div");
            wrapper.classList.add("compare-wrapper");
            
            const label = document.createElement("div");
            label.classList.add("compare-label");
            
            label.innerText = `Variant #${variant.index}  •  ${(variant.efficiency * 100).toFixed(1)}% efficiency`;
            
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add("compare-canvas");
            
            svg.style.width = "100%";
            svg.style.height = "100%";
            
            wrapper.appendChild(label);
            wrapper.appendChild(svg);
            
            container.appendChild(wrapper);
    
            requestAnimationFrame(() => {

                renderLayout({
                    boundary: boundary,
                    rooms: variant.rooms
                }, svg);
            
            });
    
        });
    
    }
    
    function renderMetrics(data) {

    const metrics = data.metrics;
    const solver = data.solver;
    const boundary = data.boundary;

    const container = document.getElementById("metrics");

    container.innerHTML = `

    <h3>Boundary</h3>
        <hr>
    
    <p>
    <strong>Boundary Width</strong>
        <span class="info-icon"
        data-tooltip="
        <strong>Description</strong><br>
        Width of the rectangular boundary drawn in Rhino.">ℹ
        </span>
        : ${data.boundary.width.toFixed(2)} m
    </p>


    <p>
    <strong>Boundary Height</strong>
        <span class="info-icon"
        data-tooltip="
        <strong>Description</strong><br>
        Height of the rectangular boundary drawn in Rhino.">ℹ
        </span>
    : ${data.boundary.height.toFixed(2)} m
    </p>

    <p>
    <strong>Gross Floor Area</strong>
        <span class="info-icon"
        data-tooltip="
        <strong>Formula</strong><br>
        Boundary width × Boundary height
        ">
        ℹ
        </span>
    : ${metrics.gross_floor_area.toFixed(2)} m²
    </p>
    

    <br>
    <br>
    
    <h3>Metrics</h3>
    <hr>
    <p>
    <strong>Net Floor Area</strong>
        <span class="info-icon"
        data-tooltip="
        <strong>Formula</strong><br>
        Sum of all room areas from generated geometry.
        ">
        ℹ
        </span>
    : ${metrics.net_floor_area.toFixed(2)} m²
    </p>

    <p>
    <strong>Common Area</strong>
        <span class="info-icon"
        data-tooltip="
        <strong>Formula</strong><br>
        Sum of room areas where category = common.
        ">
        ℹ
        </span>
    : ${metrics.common_area.toFixed(2)} m²
    </p>
    
    <p>
    <strong>Private Area</strong>
        <span class="info-icon"
        data-tooltip="
        <strong>Formula</strong><br>
        Sum of room areas where category = private.
        ">
        ℹ
        </span>
    : ${metrics.private_area.toFixed(2)} m²
    </p>
    
    <p>
        <strong>Packing Efficiency</strong>
        <span class="info-icon"
        data-tooltip="
        <strong>Formula</strong><br>
        Net Floor Area ÷ Gross Floor Area<br><br>
        <strong>Description</strong><br>
        Measures how efficiently the boundary space is used.
        ">
        ℹ
        </span>
        : ${(metrics.packing_efficiency * 100).toFixed(2)} %
    </p>
    
    <p>
    <strong>Common Ratio</strong>
        <span class="info-icon"
        data-tooltip="
        <strong>Formula</strong><br>
        Common Area ÷ Net Floor Area
        ">
        ℹ
        </span>
    : ${(metrics.common_ratio * 100).toFixed(2)} %
    </p>

    <p>
    <strong>Private Ratio</strong>
        <span class="info-icon"
        data-tooltip="
        <strong>Formula</strong><br>
        Private Area ÷ Net Floor Area
        ">
        ℹ
        </span>
    : ${(metrics.private_ratio * 100).toFixed(2)} %
    </p>
       

    <br>
    <br>

    <h3>Solver Decision</h3>
        <hr>
    <p><strong>Program Profile:</strong> ${solver.selected_profile}</p>
    <p><strong>Rotation Allowed:</strong> ${solver.rotation}</p>
    <p><strong>Sort Strategy:</strong> ${solver.sort_strategy}</p>
    <p><strong>Variants Evaluated:</strong> ${solver.variants_tested}</p>
    
    `;

    container.querySelectorAll(".info-icon").forEach(icon => {

        icon.addEventListener("mouseover", (event) => {

            showTooltip(icon.dataset.tooltip, event);

        });

        icon.addEventListener("mousemove", moveTooltip);

        icon.addEventListener("mouseleave", () => {

            hideTooltip();

        });

    });

}

window.addEventListener("resize", () => {

    if (currentLayoutData) {
        renderLayout(currentLayoutData);
    }

});

setupCanvasInteractions();
setupLegendInteractions();
loadLayout();
