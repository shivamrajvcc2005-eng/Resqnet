/* =========================================================
   ResQNet Authentication System
   Login + Signup + Logout + Protected Pages
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STORAGE KEYS
    ===================================================== */

    const USERS_KEY = "resqnetUsers";
    const SESSION_KEY = "resqnetSession";


    /* =====================================================
       PAGE SETTINGS
    ===================================================== */

    const PUBLIC_PAGES = [
        "index.html",
        "login.html",
        "report.html"
    ];


    const PROTECTED_PAGES = [
        "dashboard.html",
        "incident.html"
    ];


    /* =====================================================
       BASIC HELPERS
    ===================================================== */

    function getPageName() {

        const path =
            window.location.pathname;

        const parts =
            path.split("/");

        return (
            parts[parts.length - 1] ||
            "index.html"
        );
    }


    function getUsers() {

        try {

            const data =
                localStorage.getItem(
                    USERS_KEY
                );

            if (!data) {
                return [];
            }

            const users =
                JSON.parse(data);

            return Array.isArray(users)
                ? users
                : [];

        } catch (error) {

            console.error(
                "Could not load users:",
                error
            );

            return [];
        }
    }


    function saveUsers(users) {

        try {

            localStorage.setItem(
                USERS_KEY,
                JSON.stringify(users)
            );

            return true;

        } catch (error) {

            console.error(
                "Could not save users:",
                error
            );

            return false;
        }
    }


    function getSession() {

        try {

            const data =
                localStorage.getItem(
                    SESSION_KEY
                );

            if (!data) {
                return null;
            }

            return JSON.parse(data);

        } catch (error) {

            console.error(
                "Could not load session:",
                error
            );

            return null;
        }
    }


    function saveSession(user) {

        try {

            localStorage.setItem(
                SESSION_KEY,
                JSON.stringify({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    loginAt:
                        new Date().toISOString()
                })
            );

            return true;

        } catch (error) {

            console.error(
                "Could not save session:",
                error
            );

            return false;
        }
    }


    function clearSession() {

        localStorage.removeItem(
            SESSION_KEY
        );
    }


    /* =====================================================
       PASSWORD HASH
       ===================================================== */

    async function hashPassword(password) {

        /*
         * Browser Web Crypto API.
         * Password is not stored directly.
         */

        if (
            window.crypto &&
            window.crypto.subtle
        ) {

            const encoder =
                new TextEncoder();

            const data =
                encoder.encode(password);

            const hashBuffer =
                await crypto.subtle.digest(
                    "SHA-256",
                    data
                );

            const hashArray =
                Array.from(
                    new Uint8Array(
                        hashBuffer
                    )
                );

            return hashArray
                .map(
                    byte =>
                        byte
                            .toString(16)
                            .padStart(2, "0")
                )
                .join("");
        }


        /*
         * Fallback for older browsers.
         */

        return btoa(
            unescape(
                encodeURIComponent(
                    password
                )
            )
        );
    }


    /* =====================================================
       CREATE USER
       ===================================================== */

    async function createAccount(
        name,
        email,
        password
    ) {

        name =
            String(name || "")
                .trim();

        email =
            String(email || "")
                .trim()
                .toLowerCase();

        password =
            String(password || "");


        if (!name) {

            return {
                success: false,
                message:
                    "Please enter your name."
            };
        }


        if (!email) {

            return {
                success: false,
                message:
                    "Please enter your email."
            };
        }


        if (
            !email.includes("@") ||
            !email.includes(".")
        ) {

            return {
                success: false,
                message:
                    "Please enter a valid email."
            };
        }


        if (password.length < 6) {

            return {
                success: false,
                message:
                    "Password must be at least 6 characters."
            };
        }


        const users =
            getUsers();


        const existingUser =
            users.find(
                user =>
                    user.email ===
                    email
            );


        if (existingUser) {

            return {
                success: false,
                message:
                    "An account with this email already exists."
            };
        }


        const passwordHash =
            await hashPassword(
                password
            );


        const newUser = {

            id:
                "USR-" +
                Date.now(),

            name:
                name,

            email:
                email,

            password:
                passwordHash,

            createdAt:
                new Date().toISOString()
        };


        users.push(
            newUser
        );


        if (!saveUsers(users)) {

            return {
                success: false,
                message:
                    "Could not create account."
            };
        }


        /*
         * Automatically log user in
         */

        saveSession(
            newUser
        );


        return {
            success: true,
            user: newUser
        };
    }


    /* =====================================================
       LOGIN
       ===================================================== */

    async function login(
        email,
        password
    ) {

        email =
            String(email || "")
                .trim()
                .toLowerCase();

        password =
            String(password || "");


        if (!email || !password) {

            return {
                success: false,
                message:
                    "Please enter email and password."
            };
        }


        const users =
            getUsers();


        const user =
            users.find(
                item =>
                    item.email ===
                    email
            );


        if (!user) {

            return {
                success: false,
                message:
                    "No account found with this email."
            };
        }


        const passwordHash =
            await hashPassword(
                password
            );


        if (
            user.password !==
            passwordHash
        ) {

            return {
                success: false,
                message:
                    "Incorrect password."
            };
        }


        saveSession(
            user
        );


        return {
            success: true,
            user: user
        };
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    function logout() {

        clearSession();

        window.location.href =
            "login.html";
    }


    /* =====================================================
       PROTECT PAGE
       ===================================================== */

    function protectPage() {

        const page =
            getPageName();


        const session =
            getSession();


        if (
            PROTECTED_PAGES.includes(
                page
            )
        ) {

            if (!session) {

                window.location.href =
                    "login.html?required=1";

                return false;
            }
        }


        /*
         * Already logged-in user should
         * not remain on login page.
         */

        if (
            page === "login.html" &&
            session
        ) {

            /*
             * Only redirect if login page
             * is actually being used.
             */

            const required =
                new URLSearchParams(
                    window.location.search
                ).get("required");


            if (!required) {

                window.location.href =
                    "dashboard.html";

                return false;
            }
        }


        return true;
    }


    /* =====================================================
       CREATE LOGOUT BUTTON
       ===================================================== */

    function setupNavbar() {

        const session =
            getSession();


        /*
         * Find navbar.
         */

        const navbar =
            document.querySelector(
                ".navbar"
            );


        if (!navbar) {
            return;
        }


        /*
         * Avoid duplicate button.
         */

        if (
            navbar.querySelector(
                ".resq-auth-area"
            )
        ) {

            return;
        }


        /*
         * Find existing navigation area.
         */

        let navActions =
            navbar.querySelector(
                ".nav-actions"
            );


        /*
         * If existing nav-actions doesn't
         * exist, create one.
         */

        if (!navActions) {

            navActions =
                document.createElement(
                    "div"
                );

            navActions.className =
                "nav-actions";

            navbar.appendChild(
                navActions
            );
        }


        const authArea =
            document.createElement(
                "div"
            );


        authArea.className =
            "resq-auth-area";


        if (session) {

            authArea.innerHTML = `

                <span class="resq-user-name">
                    ${escapeHTML(
                        session.name
                    )}
                </span>

                <button
                    type="button"
                    class="resq-logout-btn"
                    id="resqLogoutBtn"
                >
                    Logout
                </button>

            `;

        } else {

            authArea.innerHTML = `

                <a
                    href="login.html"
                    class="resq-login-btn"
                >
                    Login
                </a>

            `;
        }


        navActions.appendChild(
            authArea
        );


        const logoutBtn =
            document.getElementById(
                "resqLogoutBtn"
            );


        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                logout
            );
        }
    }


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    /* =====================================================
       AUTH STYLES
       ===================================================== */

    function addAuthStyles() {

        if (
            document.getElementById(
                "resqAuthStyles"
            )
        ) {
            return;
        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "resqAuthStyles";


        style.textContent = `

            .resq-auth-area {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                margin-left: 12px;
            }

            .resq-user-name {
                color: #f7f9fc;
                font-size: 13px;
                font-weight: 700;
                white-space: nowrap;
            }

            .resq-login-btn,
            .resq-logout-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 38px;
                padding: 0 15px;
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,.10);
                background: rgba(255,255,255,.04);
                color: #ffffff;
                text-decoration: none;
                font: inherit;
                font-size: 13px;
                font-weight: 800;
                cursor: pointer;
                transition: .2s ease;
            }

            .resq-login-btn:hover,
            .resq-logout-btn:hover {
                border-color: rgba(255,48,69,.45);
                background: rgba(255,48,69,.10);
            }

            @media (max-width: 700px) {

                .resq-auth-area {
                    margin-left: 4px;
                }

                .resq-user-name {
                    display: none;
                }

                .resq-login-btn,
                .resq-logout-btn {
                    min-height: 36px;
                    padding: 0 12px;
                }
            }

        `;


        document.head.appendChild(
            style
        );
    }


    /* =====================================================
       EXPOSE AUTH FUNCTIONS
       ===================================================== */

    window.ResQAuth = {

        getSession:
            getSession,

        getUsers:
            getUsers,

        login:
            login,

        createAccount:
            createAccount,

        logout:
            logout,

        protectPage:
            protectPage

    };


    /* =====================================================
       START AUTH SYSTEM
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            const allowed =
                protectPage();


            if (!allowed) {
                return;
            }


            addAuthStyles();

            setupNavbar();

            console.log(
                "ResQNet Auth System Ready"
            );
        }
    );

})();