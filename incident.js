document.addEventListener("DOMContentLoaded", function () {

    console.log("ResQNet Incident JS Loaded");

    /* ================================
       GET INCIDENT ID
    ================================= */

    const params = new URLSearchParams(window.location.search);
    const incidentId = params.get("id");

    console.log("Incident ID:", incidentId);


    /* ================================
       ELEMENTS
    ================================= */

    const incidentIdEl = document.getElementById("incidentId");
    const statusSelect = document.getElementById("statusSelect");
    const updateStatusBtn = document.getElementById("updateStatusBtn");

    const currentStatus = document.getElementById("currentStatus");
    const currentStatusText = document.getElementById("currentStatusText");

    const timeline = document.getElementById("timeline");
    const timelineCount = document.getElementById("timelineCount");

    const incidentType = document.getElementById("incidentType");
    const incidentSeverity = document.getElementById("incidentSeverity");
    const peopleAffected = document.getElementById("peopleAffected");
    const incidentDescription = document.getElementById("incidentDescription");

    const responderUnit = document.getElementById("responderUnit");
    const responderName = document.getElementById("responderName");
    const responderContact = document.getElementById("responderContact");

    const reportedLocation = document.getElementById("reportedLocation");

    const reporterName = document.getElementById("reporterName");
    const reporterPhone = document.getElementById("reporterPhone");

    const mapContainer = document.getElementById("incidentMap");

    const toast = document.getElementById("toast");


    /* ================================
       STATUS FLOW
    ================================= */

    const STATUS_FLOW = [
        "Reported",
        "Acknowledged",
        "Responding",
        "Resolved"
    ];


    /* ================================
       LOAD REPORTS
    ================================= */

    function getReports() {

        try {

            const data =
                localStorage.getItem("resqnetReports");

            if (!data) {
                return [];
            }

            const parsed = JSON.parse(data);

            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed;

        } catch (error) {

            console.error(
                "Error loading reports:",
                error
            );

            return [];
        }
    }


    let reports = getReports();

    console.log("Reports:", reports);


    /* ================================
       FIND INCIDENT
    ================================= */

    let incident =
        reports.find(function (item) {

            return String(item.id) ===
                String(incidentId);

        });


    /* ================================
       FALLBACK CURRENT REPORT
    ================================= */

    if (!incident) {

        try {

            const current =
                localStorage.getItem(
                    "resqnetCurrentReport"
                );

            if (current) {

                const parsed =
                    JSON.parse(current);

                if (
                    String(parsed.id) ===
                    String(incidentId)
                ) {

                    incident = parsed;
                }
            }

        } catch (error) {

            console.error(
                "Current report error:",
                error
            );
        }
    }


    /* ================================
       INCIDENT NOT FOUND
    ================================= */

    if (!incident) {

        console.error(
            "Incident not found:",
            incidentId
        );

        if (timeline) {

            timeline.innerHTML = `
                <div class="empty-state">
                    Incident data not found.
                </div>
            `;
        }

        if (incidentIdEl) {
            incidentIdEl.textContent =
                incidentId || "Unknown";
        }

        return;
    }


    console.log(
        "Loaded incident:",
        incident
    );


    /* ================================
       NORMALIZE STATUS
    ================================= */

    function normalizeStatus(status) {

        const value =
            String(status || "")
                .trim()
                .toLowerCase();

        for (let i = 0; i < STATUS_FLOW.length; i++) {

            if (
                STATUS_FLOW[i].toLowerCase() ===
                value
            ) {

                return STATUS_FLOW[i];
            }
        }

        return "Reported";
    }


    /* ================================
       CURRENT STATUS
    ================================= */

    incident.status =
        normalizeStatus(
            incident.status
        );


    /* ================================
       DATE FORMAT
    ================================= */

    function formatDate(value) {

        if (!value) {
            return "Time unavailable";
        }

        const date =
            new Date(value);

        if (
            isNaN(
                date.getTime()
            )
        ) {

            return "Time unavailable";
        }

        return date.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            }
        );
    }


    /* ================================
       SAVE INCIDENT
    ================================= */

    function saveIncident() {

        try {

            let latestReports =
                getReports();

            const index =
                latestReports.findIndex(
                    function (item) {

                        return String(item.id) ===
                            String(incident.id);
                    }
                );


            if (index >= 0) {

                latestReports[index] =
                    incident;

            } else {

                latestReports.push(
                    incident
                );
            }


            localStorage.setItem(
                "resqnetReports",
                JSON.stringify(
                    latestReports
                )
            );


            localStorage.setItem(
                "resqnetCurrentReport",
                JSON.stringify(
                    incident
                )
            );


            reports =
                latestReports;

            return true;

        } catch (error) {

            console.error(
                "Save error:",
                error
            );

            return false;
        }
    }


    /* ================================
       GET OLD EVENT TIME
    ================================= */

    function getOldTime(status) {

        if (
            !Array.isArray(
                incident.timeline
            )
        ) {

            return null;
        }


        for (
            let i = 0;
            i < incident.timeline.length;
            i++
        ) {

            const event =
                incident.timeline[i];

            if (
                normalizeStatus(
                    event.status
                ) === status
            ) {

                return (
                    event.time ||
                    event.createdAt ||
                    null
                );
            }
        }

        return null;
    }


    /* ================================
       BUILD CLEAN TIMELINE
       
       THIS FIXES DUPLICATES
    ================================= */

    function buildTimeline() {

        const status =
            normalizeStatus(
                incident.status
            );


        let currentIndex =
            STATUS_FLOW.indexOf(
                status
            );


        if (currentIndex < 0) {
            currentIndex = 0;
        }


        const cleanTimeline = [];


        for (
            let i = 0;
            i <= currentIndex;
            i++
        ) {

            const stage =
                STATUS_FLOW[i];


            let time =
                getOldTime(stage);


            if (!time) {

                if (
                    stage ===
                    "Reported"
                ) {

                    time =
                        incident.createdAt ||
                        new Date().toISOString();

                } else if (
                    stage ===
                    status
                ) {

                    time =
                        incident.updatedAt ||
                        incident.createdAt ||
                        new Date().toISOString();

                } else {

                    time =
                        incident.createdAt ||
                        new Date().toISOString();
                }
            }


            cleanTimeline.push({

                status: stage,

                time: time

            });
        }


        return cleanTimeline;
    }


    /* ================================
       RENDER TIMELINE
    ================================= */

    function renderTimeline() {

        if (!timeline) {
            return;
        }


        const cleanTimeline =
            buildTimeline();


        /*
         * Save cleaned timeline
         */

        incident.timeline =
            cleanTimeline;


        timeline.innerHTML = "";


        if (timelineCount) {

            timelineCount.textContent =
                cleanTimeline.length +
                (
                    cleanTimeline.length === 1
                        ? " update"
                        : " updates"
                );
        }


        for (
            let i = 0;
            i < cleanTimeline.length;
            i++
        ) {

            const event =
                cleanTimeline[i];


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "timeline-item";


            /*
             * Last event highlight
             */

            if (
                i ===
                cleanTimeline.length - 1
            ) {

                item.classList.add(
                    "latest"
                );
            }


            item.innerHTML = `

                <div class="timeline-dot"></div>

                <div class="timeline-content">

                    <div class="timeline-status">
                        ${event.status}
                    </div>

                    <div class="timeline-time">
                        ${formatDate(event.time)}
                    </div>

                </div>

            `;


            timeline.appendChild(
                item
            );
        }
    }


    /* ================================
       RENDER STATUS
    ================================= */

    function renderStatus() {

        const status =
            normalizeStatus(
                incident.status
            );


        if (statusSelect) {

            statusSelect.value =
                status;
        }


        if (currentStatus) {

            currentStatus.textContent =
                status;
        }


        if (currentStatusText) {

            currentStatusText.textContent =
                status;
        }
    }


    /* ================================
       RENDER INCIDENT DETAILS
    ================================= */

    function renderDetails() {

        if (incidentIdEl) {

            incidentIdEl.textContent =
                incident.id || "—";
        }


        if (incidentType) {

            incidentType.textContent =
                incident.incidentType ||
                "—";
        }


        if (incidentSeverity) {

            incidentSeverity.textContent =
                incident.severity ||
                "—";
        }


        if (peopleAffected) {

            peopleAffected.textContent =
                incident.peopleCount ??
                "—";
        }


        if (incidentDescription) {

            incidentDescription.textContent =
                incident.description ||
                "No description provided.";
        }


        /* ============================
           ASSIGNMENT
        ============================ */

        if (
            incident.assignment &&
            typeof incident.assignment ===
            "object"
        ) {

            if (responderUnit) {

                responderUnit.textContent =
                    incident.assignment.unit ||
                    "Not assigned";
            }


            if (responderName) {

                responderName.textContent =
                    incident.assignment.responder ||
                    "Awaiting responder";
            }


            if (responderContact) {

                responderContact.textContent =
                    incident.assignment.contact ||
                    "—";
            }

        } else {

            if (responderUnit) {

                responderUnit.textContent =
                    "Not assigned";
            }


            if (responderName) {

                responderName.textContent =
                    "Awaiting responder";
            }


            if (responderContact) {

                responderContact.textContent =
                    "—";
            }
        }


        /* ============================
           REPORTER
        ============================ */

        if (
            incident.reporter &&
            typeof incident.reporter ===
            "object"
        ) {

            if (reporterName) {

                reporterName.textContent =
                    incident.reporter.name ||
                    "—";
            }


            if (reporterPhone) {

                reporterPhone.textContent =
                    incident.reporter.phone ||
                    "—";
            }

        } else {

            if (reporterName) {

                reporterName.textContent =
                    "—";
            }


            if (reporterPhone) {

                reporterPhone.textContent =
                    "—";
            }
        }


        /* ============================
           LOCATION
        ============================ */

        if (
            incident.location &&
            typeof incident.location ===
            "object"
        ) {

            const manual =
                incident.location.manual ||
                "";


            const lat =
                incident.location.latitude;


            const lng =
                incident.location.longitude;


            if (reportedLocation) {

                if (manual) {

                    reportedLocation.textContent =
                        "Reported location: " +
                        manual;

                } else if (
                    lat !== undefined &&
                    lng !== undefined
                ) {

                    reportedLocation.textContent =
                        "Reported coordinates: " +
                        lat +
                        ", " +
                        lng;

                } else {

                    reportedLocation.textContent =
                        "Location not available";
                }
            }

        } else {

            if (reportedLocation) {

                reportedLocation.textContent =
                    "Location not available";
            }
        }
    }


    /* ================================
       MAP
    ================================= */

    function renderMap() {

        if (!mapContainer) {
            return;
        }


        if (
            typeof L ===
            "undefined"
        ) {

            mapContainer.innerHTML = `
                <div
                    style="
                        height:100%;
                        display:grid;
                        place-items:center;
                        color:#8c99a8;
                        background:#0d1722;
                    "
                >
                    Map unavailable
                </div>
            `;

            return;
        }


        const location =
            incident.location || {};


        const lat =
            Number(
                location.latitude
            );


        const lng =
            Number(
                location.longitude
            );


        const hasGPS =
            Number.isFinite(lat) &&
            Number.isFinite(lng);


        let map;


        if (hasGPS) {

            map =
                L.map(
                    mapContainer
                ).setView(
                    [
                        lat,
                        lng
                    ],
                    15
                );


            L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    maxZoom: 19,
                    attribution:
                        "&copy; OpenStreetMap"
                }
            ).addTo(map);


            L.marker([
                lat,
                lng
            ])
            .addTo(map)
            .bindPopup(
                incident.incidentType ||
                "Emergency"
            )
            .openPopup();

        } else {

            map =
                L.map(
                    mapContainer
                ).setView(
                    [
                        20.5937,
                        78.9629
                    ],
                    5
                );


            L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    maxZoom: 19,
                    attribution:
                        "&copy; OpenStreetMap"
                }
            ).addTo(map);
        }
    }


    /* ================================
       UPDATE STATUS
    ================================= */

    if (updateStatusBtn) {

        updateStatusBtn.addEventListener(
            "click",
            function () {

                const newStatus =
                    normalizeStatus(
                        statusSelect.value
                    );


                const oldStatus =
                    normalizeStatus(
                        incident.status
                    );


                if (
                    newStatus ===
                    oldStatus
                ) {

                    showToast(
                        "Status already " +
                        newStatus
                    );

                    return;
                }


                incident.status =
                    newStatus;


                incident.updatedAt =
                    new Date().toISOString();


                /*
                 * Clean workflow
                 */

                incident.timeline =
                    buildTimeline();


                if (
                    !saveIncident()
                ) {

                    showToast(
                        "Could not save status."
                    );

                    return;
                }


                renderStatus();

                renderTimeline();

                showToast(
                    "Status updated to " +
                    newStatus
                );
            }
        );
    }


    /* ================================
       TOAST
    ================================= */

    function showToast(message) {

        if (!toast) {
            return;
        }


        toast.textContent =
            message;


        toast.classList.add(
            "show"
        );


        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );
    }


    /* ================================
       INITIAL LOAD
    ================================= */

    renderDetails();

    renderStatus();

    renderTimeline();

    renderMap();


    /*
     * Save cleaned timeline
     * immediately.
     */

    saveIncident();


    console.log(
        "ResQNet Incident Page Ready"
    );

});