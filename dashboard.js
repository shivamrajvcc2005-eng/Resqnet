document.addEventListener("DOMContentLoaded", function () {

    /* =========================================
       ELEMENTS
    ========================================= */

    const totalIncidents =
        document.getElementById("totalIncidents");

    const activeIncidents =
        document.getElementById("activeIncidents");

    const priorityIncidents =
        document.getElementById("priorityIncidents");

    const resolvedIncidents =
        document.getElementById("resolvedIncidents");

    const incidentList =
        document.getElementById("incidentList");

    const incidentSearch =
        document.getElementById("incidentSearch");

    const statusFilter =
        document.getElementById("statusFilter");

    const severityFilter =
        document.getElementById("severityFilter");

    const clearFilters =
        document.getElementById("clearFilters");

    const toast =
        document.getElementById("toast");

    const mapElement =
        document.getElementById("dashboardMap");


    let dashboardMap = null;
    let markerLayer = null;
    let toastTimer = null;


    /* =========================================
       STORAGE
    ========================================= */

    function getReports() {

        try {

            const data =
                localStorage.getItem("resqnetReports");

            if (!data) {
                return [];
            }

            const reports =
                JSON.parse(data);

            return Array.isArray(reports)
                ? reports
                : [];

        } catch (error) {

            console.error(
                "Storage read error:",
                error
            );

            return [];

        }

    }


    function saveReports(reports) {

        localStorage.setItem(
            "resqnetReports",
            JSON.stringify(reports)
        );

    }


    /* =========================================
       TOAST
    ========================================= */

    function showToast(message) {

        if (!toast) return;

        toast.textContent = message;

        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer =
            setTimeout(function () {

                toast.classList.remove("show");

            }, 2500);

    }


    /* =========================================
       STATS
    ========================================= */

    function updateStats(reports) {

        const total =
            reports.length;

        const active =
            reports.filter(function (report) {

                return report.status !== "Resolved";

            }).length;


        const priority =
            reports.filter(function (report) {

                return (
                    report.severity === "Critical" ||
                    report.severity === "High"
                );

            }).length;


        const resolved =
            reports.filter(function (report) {

                return report.status === "Resolved";

            }).length;


        if (totalIncidents) {
            totalIncidents.textContent = total;
        }

        if (activeIncidents) {
            activeIncidents.textContent = active;
        }

        if (priorityIncidents) {
            priorityIncidents.textContent = priority;
        }

        if (resolvedIncidents) {
            resolvedIncidents.textContent = resolved;
        }

    }


    /* =========================================
       STATUS CLASS
    ========================================= */

    function getStatusClass(status) {

        return String(status || "")
            .toLowerCase()
            .replace(/\s+/g, "-");

    }


    /* =========================================
       FILTER
    ========================================= */

    function getFilteredReports(reports) {

        const search =
            incidentSearch
                ? incidentSearch.value
                    .trim()
                    .toLowerCase()
                : "";


        const status =
            statusFilter
                ? statusFilter.value
                : "all";


        const severity =
            severityFilter
                ? severityFilter.value
                : "all";


        return reports.filter(function (report) {

            const location =
                report.location &&
                report.location.manual
                    ? report.location.manual
                    : "";


            const searchText = (

                String(report.id || "") +
                " " +
                String(report.incidentType || "") +
                " " +
                String(location)

            ).toLowerCase();


            const searchMatch =
                !search ||
                searchText.includes(search);


            const statusMatch =
                status === "all" ||
                report.status === status;


            const severityMatch =
                severity === "all" ||
                report.severity === severity;


            return (
                searchMatch &&
                statusMatch &&
                severityMatch
            );

        });

    }


    /* =========================================
       ASSIGNMENT FORM CHECK
    ========================================= */

    function hasOpenAssignmentForm() {

        return !!document.querySelector(
            ".assignment-panel.open"
        );

    }


    /* =========================================
       RENDER INCIDENTS
    ========================================= */

    function renderIncidents(reports) {

        if (!incidentList) return;


        const filtered =
            getFilteredReports(reports);


        if (filtered.length === 0) {

            if (reports.length === 0) {

                incidentList.innerHTML = `

                    <div class="empty-state">

                        <div class="empty-icon">
                            ✓
                        </div>

                        <strong>
                            No incidents yet
                        </strong>

                        <span>
                            Reported emergencies will appear here.
                        </span>

                    </div>

                `;

            } else {

                incidentList.innerHTML = `

                    <div class="no-results">

                        <strong>
                            No matching incidents
                        </strong>

                        <span>
                            Try changing the search or filters.
                        </span>

                    </div>

                `;

            }

            return;

        }


        filtered.sort(function (a, b) {

            return new Date(
                b.createdAt || 0
            ) - new Date(
                a.createdAt || 0
            );

        });


        incidentList.innerHTML = "";


        filtered.forEach(function (report) {

            const item =
                document.createElement("div");

            item.className =
                "incident-item" +
                (
                    report.status === "Resolved"
                        ? " resolved"
                        : ""
                );


            const location =
                report.location &&
                report.location.manual
                    ? report.location.manual
                    : (
                        report.location &&
                        report.location.latitude !== null
                            ? "GPS location available"
                            : "Location not provided"
                    );


            const assignment =
                report.assignment;


            const statusClass =
                getStatusClass(report.status);


            const severityClass =
                String(report.severity || "")
                    .toLowerCase();


            item.innerHTML = `

                <div class="incident-main">

                    <div class="incident-top">

                        <div class="incident-title-row">

                            <span class="incident-type">
                                ${escapeHTML(
                                    report.incidentType ||
                                    "Emergency"
                                )}
                            </span>

                            <span class="incident-id-small">
                                ${escapeHTML(
                                    report.id || ""
                                )}
                            </span>

                        </div>

                        <div>

                            <span class="priority-badge ${severityClass}">
                                ${escapeHTML(
                                    report.severity ||
                                    "Medium"
                                )}
                            </span>

                            <span class="status-badge ${statusClass}">
                                ${escapeHTML(
                                    report.status ||
                                    "Reported"
                                )}
                            </span>

                        </div>

                    </div>


                    <div class="incident-meta">

                        <span>
                            👥
                            ${escapeHTML(
                                String(
                                    report.peopleCount || 0
                                )
                            )}
                            affected
                        </span>

                        <span>
                            🕒
                            ${formatDate(
                                report.createdAt
                            )}
                        </span>

                    </div>


                    <div class="incident-location">
                        📍
                        ${escapeHTML(location)}
                    </div>


                    ${
                        assignment
                            ? `
                                <div class="assignment-preview">

                                    <strong>
                                        Response Team:
                                    </strong>

                                    <span>
                                        ${escapeHTML(
                                            assignment.unit ||
                                            ""
                                        )}
                                    </span>

                                    —
                                    ${escapeHTML(
                                        assignment.responder ||
                                        ""
                                    )}

                                </div>
                              `
                            : ""
                    }


                    <div class="incident-actions">

                        <a
                            href="incident.html?id=${encodeURIComponent(
                                report.id
                            )}"
                            class="details-btn"
                        >
                            View Details
                        </a>

                        <button
                            type="button"
                            class="assign-btn"
                            data-id="${escapeHTML(
                                report.id
                            )}"
                        >
                            ${
                                assignment
                                    ? "Edit Assignment"
                                    : "Assign Responder"
                            }
                        </button>

                    </div>


                    <div
                        class="assignment-panel"
                        data-panel="${escapeHTML(
                            report.id
                        )}"
                    >

                        <h4>
                            Response Team Assignment
                        </h4>

                        <div class="assignment-form">

                            <select
                                class="assignment-unit full"
                            >

                                <option value="">
                                    Select Response Unit
                                </option>

                                <option value="Ambulance">
                                    Ambulance
                                </option>

                                <option value="Fire Response">
                                    Fire Response
                                </option>

                                <option value="Police">
                                    Police
                                </option>

                                <option value="Rescue Team">
                                    Rescue Team
                                </option>

                            </select>


                            <input
                                type="text"
                                class="assignment-responder"
                                placeholder="Responder name"
                            >


                            <input
                                type="tel"
                                class="assignment-contact"
                                maxlength="10"
                                placeholder="10-digit contact"
                            >

                        </div>


                        <div class="assignment-actions">

                            <button
                                type="button"
                                class="cancel-assignment"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                class="save-assignment"
                            >
                                Save Assignment
                            </button>

                        </div>

                    </div>

                </div>

            `;


            incidentList.appendChild(item);


            /* =====================================
               ASSIGN BUTTON
            ====================================== */

            const assignButton =
                item.querySelector(".assign-btn");

            const panel =
                item.querySelector(".assignment-panel");


            if (assignment) {

                panel.querySelector(
                    ".assignment-unit"
                ).value =
                    assignment.unit || "";

                panel.querySelector(
                    ".assignment-responder"
                ).value =
                    assignment.responder || "";

                panel.querySelector(
                    ".assignment-contact"
                ).value =
                    assignment.contact || "";

            }


            assignButton.addEventListener(
                "click",
                function () {

                    panel.classList.toggle("open");

                }
            );


            /* =====================================
               CANCEL
            ====================================== */

            const cancelButton =
                item.querySelector(
                    ".cancel-assignment"
                );


            cancelButton.addEventListener(
                "click",
                function () {

                    panel.classList.remove(
                        "open"
                    );

                }
            );


            /* =====================================
               SAVE ASSIGNMENT
            ====================================== */

            const saveButton =
                item.querySelector(
                    ".save-assignment"
                );


            saveButton.addEventListener(
                "click",
                function () {

                    saveAssignment(
                        report.id,
                        item
                    );

                }
            );

        });

    }


    /* =========================================
       SAVE ASSIGNMENT
    ========================================= */

    function saveAssignment(id, item) {

        const unit =
            item.querySelector(
                ".assignment-unit"
            ).value;


        const responder =
            item.querySelector(
                ".assignment-responder"
            ).value.trim();


        const contact =
            item.querySelector(
                ".assignment-contact"
            ).value
                .replace(/\D/g, "");


        if (!unit) {

            showToast(
                "Please select a response unit."
            );

            return;

        }


        if (!responder) {

            showToast(
                "Please enter responder name."
            );

            return;

        }


        if (!/^\d{10}$/.test(contact)) {

            showToast(
                "Enter a valid 10-digit contact number."
            );

            return;

        }


        const reports =
            getReports();


        const index =
            reports.findIndex(function (report) {

                return report.id === id;

            });


        if (index === -1) {

            showToast(
                "Incident not found."
            );

            return;

        }


        const now =
            new Date().toISOString();


        reports[index].assignment = {

            unit: unit,

            responder: responder,

            contact: contact,

            assignedAt: now

        };


        /* =====================================
           AUTO ACKNOWLEDGE
        ====================================== */

        if (
            !reports[index].status ||
            reports[index].status === "Reported"
        ) {

            reports[index].status =
                "Acknowledged";


            if (!Array.isArray(
                reports[index].timeline
            )) {

                reports[index].timeline = [];

            }


            reports[index].timeline.push({

                status: "Acknowledged",

                time: now

            });

        }


        reports[index].updatedAt =
            now;


        saveReports(reports);


        showToast(
            "Responder assigned successfully."
        );


        renderDashboard();

    }


    /* =========================================
       MAP INIT
    ========================================= */

    function initializeMap() {

        if (!mapElement) {

            console.error(
                "dashboardMap element not found."
            );

            return;

        }


        if (typeof L === "undefined") {

            console.error(
                "Leaflet library not loaded."
            );

            mapElement.innerHTML = `

                <div style="
                    height:100%;
                    display:grid;
                    place-items:center;
                    color:#8c99a8;
                    background:#070d14;
                    text-align:center;
                    padding:20px;
                ">

                    <div>
                        <strong style="
                            display:block;
                            color:#f7f9fc;
                            margin-bottom:6px;
                        ">
                            Map unavailable
                        </strong>

                        Leaflet could not be loaded.
                    </div>

                </div>

            `;

            return;

        }


        try {

            dashboardMap =
                L.map(
                    mapElement,
                    {
                        zoomControl: true
                    }
                ).setView(
                    [20.5937, 78.9629],
                    5
                );


            L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    maxZoom: 19,
                    attribution:
                        "&copy; OpenStreetMap contributors"
                }
            ).addTo(
                dashboardMap
            );


            markerLayer =
                L.layerGroup().addTo(
                    dashboardMap
                );


            setTimeout(function () {

                dashboardMap.invalidateSize();

            }, 300);


        } catch (error) {

            console.error(
                "Map initialization error:",
                error
            );

        }

    }


    /* =========================================
       RENDER MAP
    ========================================= */

    function renderMap(reports) {

        if (!dashboardMap || !markerLayer) {
            return;
        }


        markerLayer.clearLayers();


        const mappedReports =
            reports.filter(function (report) {

                return (
                    report.location &&
                    typeof report.location.latitude === "number" &&
                    typeof report.location.longitude === "number"
                );

            });


        if (mappedReports.length === 0) {

            dashboardMap.setView(
                [20.5937, 78.9629],
                5
            );

            return;

        }


        const bounds = [];


        mappedReports.forEach(function (report) {

            const lat =
                report.location.latitude;

            const lng =
                report.location.longitude;


            if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng)
            ) {
                return;
            }


            bounds.push([
                lat,
                lng
            ]);


            const isResolved =
                report.status === "Resolved";


            const marker =
                L.circleMarker(
                    [lat, lng],
                    {
                        radius: 9,

                        color: isResolved
                            ? "#7d8994"
                            : "#ff3045",

                        fillColor: isResolved
                            ? "#7d8994"
                            : "#ff3045",

                        fillOpacity: .9,

                        weight: 2
                    }
                );


            const assignment =
                report.assignment;


            const popup = `

                <div>

                    <div class="map-popup-title">
                        ${escapeHTML(
                            report.incidentType ||
                            "Emergency"
                        )}
                    </div>

                    <div class="map-popup-meta">

                        ID:
                        ${escapeHTML(
                            report.id || ""
                        )}

                        <br>

                        Severity:
                        ${escapeHTML(
                            report.severity ||
                            "Medium"
                        )}

                        <br>

                        Status:
                        ${escapeHTML(
                            report.status ||
                            "Reported"
                        )}

                        ${
                            assignment
                                ? `
                                    <br>
                                    Response:
                                    ${escapeHTML(
                                        assignment.unit ||
                                        ""
                                    )}
                                    — 
                                    ${escapeHTML(
                                        assignment.responder ||
                                        ""
                                    )}
                                  `
                                : ""
                        }

                    </div>

                    <a
                        class="map-popup-link"
                        href="incident.html?id=${encodeURIComponent(
                            report.id
                        )}"
                    >
                        View Incident →
                    </a>

                </div>

            `;


            marker
                .bindPopup(popup)
                .addTo(markerLayer);

        });


        if (bounds.length === 1) {

            dashboardMap.setView(
                bounds[0],
                14
            );

        } else if (bounds.length > 1) {

            dashboardMap.fitBounds(
                bounds,
                {
                    padding: [30, 30],
                    maxZoom: 15
                }
            );

        }

    }


    /* =========================================
       RENDER DASHBOARD
    ========================================= */

    function renderDashboard() {

        const reports =
            getReports();


        updateStats(
            reports
        );


        renderIncidents(
            reports
        );


        renderMap(
            reports
        );

    }


    /* =========================================
       ESCAPE HTML
    ========================================= */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =========================================
       DATE FORMAT
    ========================================= */

    function formatDate(dateValue) {

        if (!dateValue) {
            return "Unknown time";
        }


        const date =
            new Date(dateValue);


        if (Number.isNaN(
            date.getTime()
        )) {

            return "Unknown time";

        }


        return date.toLocaleString(
            undefined,
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    /* =========================================
       FILTER EVENTS
    ========================================= */

    if (incidentSearch) {

        incidentSearch.addEventListener(
            "input",
            function () {

                if (
                    hasOpenAssignmentForm()
                ) {
                    return;
                }

                renderDashboard();

            }
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            function () {

                if (
                    hasOpenAssignmentForm()
                ) {
                    return;
                }

                renderDashboard();

            }
        );

    }


    if (severityFilter) {

        severityFilter.addEventListener(
            "change",
            function () {

                if (
                    hasOpenAssignmentForm()
                ) {
                    return;
                }

                renderDashboard();

            }
        );

    }


    if (clearFilters) {

        clearFilters.addEventListener(
            "click",
            function () {

                if (incidentSearch) {
                    incidentSearch.value = "";
                }

                if (statusFilter) {
                    statusFilter.value = "all";
                }

                if (severityFilter) {
                    severityFilter.value = "all";
                }

                renderDashboard();

            }
        );

    }


    /* =========================================
       STORAGE SYNC
    ========================================= */

    window.addEventListener(
        "storage",
        function (event) {

            if (
                event.key === "resqnetReports" &&
                !hasOpenAssignmentForm()
            ) {

                renderDashboard();

            }

        }
    );


    /* =========================================
       AUTO REFRESH
    ========================================= */

    setInterval(
        function () {

            if (
                !hasOpenAssignmentForm()
            ) {

                renderDashboard();

            }

        },
        5000
    );


    /* =========================================
       START
    ========================================= */

    initializeMap();

    renderDashboard();


    setTimeout(function () {

        if (dashboardMap) {

            dashboardMap.invalidateSize();

        }

    }, 500);

});