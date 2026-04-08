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
  PAYMENT_MODE: "local-dev",

  /* =========================
     DOMAIN + BACKEND (FILL LATER)
  ========================= */
  DOMAIN_URL: "",

  API_BASE_URL: "",

  /* =========================
     ENDPOINTS
  ========================= */
  VERIFY_ENDPOINT: "/verify-unlock-code",
  CREATE_ORDER_ENDPOINT: "/create-order",

  /* =========================
     PAYHERE SETTINGS (FILL LATER)
  ========================= */
  PAYHERE_MERCHANT_ID: "",
  PAYHERE_PUBLIC_CHECKOUT_URL: "",
  PAYHERE_NOTIFY_URL: "",
  PAYHERE_RETURN_URL: "",
  PAYHERE_CANCEL_URL: "",

  /* =========================
     GOOGLE SIGN-IN (FILL LATER)
  ========================= */
  GOOGLE_CLIENT_ID: "",

  /* =========================
     LOCAL STORAGE KEY
  ========================= */
  APP_STORAGE_KEY: "qsp_user_state_v1",

  /* =========================
     DEV TESTING ONLY
  ========================= */
  DEV_UNLOCK_CODES: [
    "MY-OWNER-CODE-2026"
  ]
};
