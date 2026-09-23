document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("emergencyForm");
    const gpsButton = document.getElementById("gpsButton");
    const locationStatus = document.getElementById("locationStatus");
    const manualLocation = document.getElementById("manualLocation");

    const description = document.getElementById("description");
    const charCount = document.getElementById("charCount");

    const formError = document.getElementById("formError");

    const reportFormLayout = document.getElementById("reportFormLayout");
    const successScreen = document.getElementById("successScreen");
    const generatedId = document.getElementById("generatedId");

    let gpsLocation = null;


    /* =========================================
       CHARACTER COUNTER
    ========================================= */

    if (description && charCount) {

        description.addEventListener("input", function () {

            charCount.textContent =
                description.value.length + " / 500";

        });

    }


    /* =========================================
       GPS LOCATION
    ========================================= */

    if (gpsButton) {

        gpsButton.addEventListener("click", function () {

            if (!navigator.geolocation) {

                locationStatus.textContent =
                    "GPS is not supported by this browser.";

                return;

            }

            locationStatus.textContent =
                "Detecting your location...";

            gpsButton.disabled = true;
            gpsButton.textContent = "📍 Detecting...";


            navigator.geolocation.getCurrentPosition(

                function (position) {

                    gpsLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };


                    locationStatus.textContent =
                        "✓ GPS location detected successfully.";


                    gpsButton.disabled = false;
                    gpsButton.textContent =
                        "📍 Location Detected";

                },

                function (error) {

                    gpsLocation = null;

                    gpsButton.disabled = false;
                    gpsButton.textContent =
                        "📍 Use My GPS Location";


                    if (error.code === 1) {

                        locationStatus.textContent =
                            "Location permission denied. Please enter location manually.";

                    } else {

                        locationStatus.textContent =
                            "Unable to detect GPS. Please enter location manually.";

                    }

                },

                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }

            );

        });

    }


    /* =========================================
       GET RADIO VALUE
    ========================================= */

    function getRadioValue(name) {

        const selected =
            document.querySelector(
                'input[name="' + name + '"]:checked'
            );

        return selected ? selected.value : "";

    }


    /* =========================================
       SHOW ERROR
    ========================================= */

    function showError(message) {

        if (!formError) return;

        formError.textContent = message;
        formError.style.display = "block";

        formError.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }


    function hideError() {

        if (!formError) return;

        formError.textContent = "";
        formError.style.display = "none";

    }


    /* =========================================
       GENERATE INCIDENT ID
    ========================================= */

    function generateIncidentId() {

        const year = new Date().getFullYear();

        let number =
            Math.floor(1000 + Math.random() * 9000);

        return "RQ-" + year + "-" + number;

    }


    /* =========================================
       GET EXISTING REPORTS
    ========================================= */

    function getReports() {

        try {

            const saved =
                localStorage.getItem("resqnetReports");

            if (!saved) {
                return [];
            }

            const reports = JSON.parse(saved);

            return Array.isArray(reports)
                ? reports
                : [];

        } catch (error) {

            console.error(
                "Unable to read reports:",
                error
            );

            return [];

        }

    }


    /* =========================================
       SAVE REPORTS
    ========================================= */

    function saveReports(reports) {

        localStorage.setItem(
            "resqnetReports",
            JSON.stringify(reports)
        );

    }


    /* =========================================
       FORM SUBMIT
    ========================================= */

    if (form) {

        form.addEventListener("submit", function (event) {

            event.preventDefault();

            hideError();


            /* -------------------------------
               INCIDENT TYPE
            -------------------------------- */

            const incidentType =
                getRadioValue("incidentType");

            if (!incidentType) {

                showError(
                    "Please select the type of emergency."
                );

                return;

            }


            /* -------------------------------
               PEOPLE
            -------------------------------- */

            const peopleInput =
                document.getElementById("peopleCount");

            const peopleCount =
                peopleInput
                    ? Number(peopleInput.value)
                    : 0;


            if (
                !Number.isFinite(peopleCount) ||
                peopleCount < 1
            ) {

                showError(
                    "Please enter the number of people affected."
                );

                return;

            }


            /* -------------------------------
               SEVERITY
            -------------------------------- */

            const severity =
                getRadioValue("severity");

            if (!severity) {

                showError(
                    "Please select the emergency severity."
                );

                return;

            }


            /* -------------------------------
               DESCRIPTION
            -------------------------------- */

            const descriptionValue =
                description
                    ? description.value.trim()
                    : "";


            if (!descriptionValue) {

                showError(
                    "Please describe what is happening."
                );

                return;

            }


            /* -------------------------------
               LOCATION
            -------------------------------- */

            const manualLocationValue =
                manualLocation
                    ? manualLocation.value.trim()
                    : "";


            if (
                !manualLocationValue &&
                !gpsLocation
            ) {

                showError(
                    "Please use GPS location or enter a location manually."
                );

                return;

            }


            /* -------------------------------
               REPORTER
            -------------------------------- */

            const reporterNameElement =
                document.getElementById("reporterName");

            const reporterPhoneElement =
                document.getElementById("reporterPhone");


            const reporterName =
                reporterNameElement
                    ? reporterNameElement.value.trim()
                    : "";


            const reporterPhone =
                reporterPhoneElement
                    ? reporterPhoneElement.value.trim()
                    : "";


            /* -------------------------------
               CREATE INCIDENT
            -------------------------------- */

            const incidentId =
                generateIncidentId();

            const now =
                new Date().toISOString();


            const report = {

                id: incidentId,

                incidentType: incidentType,

                peopleCount: peopleCount,

                severity: severity,

                description: descriptionValue,

                location: {

                    manual: manualLocationValue,

                    latitude:
                        gpsLocation
                            ? gpsLocation.latitude
                            : null,

                    longitude:
                        gpsLocation
                            ? gpsLocation.longitude
                            : null,

                    accuracy:
                        gpsLocation
                            ? gpsLocation.accuracy
                            : null

                },

                reporter: {

                    name: reporterName,

                    phone: reporterPhone

                },

                status: "Reported",

                createdAt: now,

                updatedAt: now,

                timeline: [

                    {
                        status: "Reported",
                        time: now
                    }

                ]

            };


            /* -------------------------------
               SAVE
            -------------------------------- */

            try {

                const reports =
                    getReports();

                reports.push(report);

                saveReports(reports);


                localStorage.setItem(
                    "resqnetCurrentReport",
                    JSON.stringify(report)
                );


                /* -------------------------------
                   SUCCESS SCREEN
                -------------------------------- */

                if (generatedId) {

                    generatedId.textContent =
                        incidentId;

                }


                if (reportFormLayout) {

                    reportFormLayout.style.display =
                        "none";

                }


                if (successScreen) {

                    successScreen.style.display =
                        "block";

                    successScreen.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }


                console.log(
                    "ResQNet incident created:",
                    report
                );


            } catch (error) {

                console.error(
                    "Report save error:",
                    error
                );

                showError(
                    "Unable to save the report. Please try again."
                );

            }

        });

    }

});