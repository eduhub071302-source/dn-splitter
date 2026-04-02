/* =========================================
   Question Splitter Pro
   Central Configuration File

   👉 ONLY FILE YOU NEED TO EDIT LATER
   when adding:
   - domain
   - backend
   - PayHere
   - Google login

   Everything else stays unchanged.
========================================= */

window.APP_CONFIG = {
  /* =========================
     BASIC APP SETTINGS
  ========================= */
  APP_NAME: "DN Splitter",

  FREE_UPLOAD_LIMIT: 3,

  PRICE_LKR: 100,

  /* =========================
     MODE CONTROL
     ---------------------------------
     "future-auto" → production (after PayHere)
     "local-dev"   → testing unlock codes
  ========================= */
  PAYMENT_MODE: "future-auto",

  /* =========================
     DOMAIN + BACKEND (FILL LATER)
  ========================= */
  DOMAIN_URL: "",

  API_BASE_URL: "",
  // Example later:
  // "https://yourdomain.com/api"

  /* =========================
     ENDPOINTS (BACKEND ROUTES)
     You usually DON'T change these
  ========================= */
  VERIFY_ENDPOINT: "/verify-unlock-code",
  CREATE_ORDER_ENDPOINT: "/create-order",

  /* =========================
     PAYHERE SETTINGS (FILL LATER)
  ========================= */
  PAYHERE_MERCHANT_ID: "",

  PAYHERE_PUBLIC_CHECKOUT_URL: "",
  // Example:
  // "https://yourdomain.com/pay"

  PAYHERE_NOTIFY_URL: "",
  PAYHERE_RETURN_URL: "",
  PAYHERE_CANCEL_URL: "",

  /* =========================
     GOOGLE SIGN-IN (FILL LATER)
  ========================= */
  GOOGLE_CLIENT_ID: "",

  /* =========================
     LOCAL STORAGE KEY
     (Do not change after launch)
  ========================= */
  APP_STORAGE_KEY: "qsp_user_state_v1",

  /* =========================
     DEV TESTING ONLY
     ---------------------------------
     Only used when PAYMENT_MODE = "local-dev"
  ========================= */
  DEV_UNLOCK_CODES: [
    "TEST-UNLOCK-100",
    "ADMIN-TEST-2026"
  ]
};