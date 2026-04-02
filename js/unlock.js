/* =========================================
   Question Splitter Pro
   Unlock + User System
   - local app state
   - 3 free uploads
   - unlock modal
   - future-ready Google sign-in placeholders
   - future-ready payment placeholders
========================================= */

(function () {
  "use strict";

  /* =========================
     SAFE CONFIG
  ========================= */
  const CONFIG = window.APP_CONFIG || {
    APP_NAME: "Question Splitter Pro",
    FREE_UPLOAD_LIMIT: 3,
    PRICE_LKR: 100,
    PAYMENT_MODE: "future-auto", // future-auto | local-dev
    API_BASE_URL: "",
    VERIFY_ENDPOINT: "/verify-unlock-code",
    CREATE_ORDER_ENDPOINT: "/create-order",
    APP_STORAGE_KEY: "qsp_user_state_v1",
    DEV_UNLOCK_CODES: ["TEST-UNLOCK-100", "ADMIN-TEST-2026"],
    GOOGLE_CLIENT_ID: ""
  };

  /* =========================
     DOM
  ========================= */
  const unlockModal = document.getElementById("unlockModal");
  const closeUnlockModalBtn = document.getElementById("closeUnlockModalBtn");

  const buyerEmailInput = document.getElementById("buyerEmailInput");
  const unlockCodeInput = document.getElementById("unlockCodeInput");
  const verifyUnlockBtn = document.getElementById("verifyUnlockBtn");
  const buyNowBtn = document.getElementById("buyNowBtn");
  const unlockStatusText = document.getElementById("unlockStatusText");

  const googleSignInBtn = document.getElementById("googleSignInBtn");
  const googleSignOutBtn = document.getElementById("googleSignOutBtn");
  const googleSignedOutState = document.getElementById("googleSignedOutState");
  const googleSignedInState = document.getElementById("googleSignedInState");
  const signedUserName = document.getElementById("signedUserName");
  const signedUserEmail = document.getElementById("signedUserEmail");
  const userAvatarCircle = document.getElementById("userAvatarCircle");

  /* =========================
     STORAGE
  ========================= */
  const defaultState = {
    uploadsUsed: 0,
    unlocked: false,
    unlockEmail: "",
    unlockCode: "",
    googleUser: null
  };

  let appState = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG.APP_STORAGE_KEY) || "{}");
      return { ...defaultState, ...saved };
    } catch (error) {
      console.error("Could not load saved unlock state:", error);
      return { ...defaultState };
    }
  }

  function saveState() {
    localStorage.setItem(CONFIG.APP_STORAGE_KEY, JSON.stringify(appState));
  }

  /* =========================
     HELPERS
  ========================= */
  function setUnlockStatus(text, isError = false) {
    if (!unlockStatusText) return;
    unlockStatusText.textContent = text || "";
    unlockStatusText.style.color = isError ? "#ffd0d0" : "#d7e7ff";
  }

  function openUnlockModal() {
    if (!unlockModal) return;
    unlockModal.classList.remove("hidden");
    unlockModal.setAttribute("aria-hidden", "false");
    syncInputsFromState();
    setUnlockStatus("");
  }

  function closeUnlockModal() {
    if (!unlockModal) return;
    unlockModal.classList.add("hidden");
    unlockModal.setAttribute("aria-hidden", "true");
  }

  function syncInputsFromState() {
    if (buyerEmailInput) buyerEmailInput.value = appState.unlockEmail || "";
    if (unlockCodeInput) unlockCodeInput.value = appState.unlockCode || "";
  }

  function refreshAllUI() {
    syncInputsFromState();
    refreshGoogleAccountUI();

    if (window.QuestionSplitterApp && typeof window.QuestionSplitterApp.refreshUsageUI === "function") {
      window.QuestionSplitterApp.refreshUsageUI();
    }
  }

  function canUseUpload() {
    return appState.unlocked || appState.uploadsUsed < CONFIG.FREE_UPLOAD_LIMIT;
  }

  function registerUploadUsage() {
    if (!appState.unlocked) {
      appState.uploadsUsed += 1;
      saveState();
      refreshAllUI();
    }
  }

  function getState() {
    return { ...appState };
  }

  /* =========================
     GOOGLE ACCOUNT UI
  ========================= */
  function refreshGoogleAccountUI() {
    const user = appState.googleUser;

    if (!googleSignedOutState || !googleSignedInState) return;

    if (user) {
      googleSignedOutState.classList.add("hidden");
      googleSignedInState.classList.remove("hidden");

      if (signedUserName) signedUserName.textContent = user.name || "Google User";
      if (signedUserEmail) signedUserEmail.textContent = user.email || "user@email.com";

      if (userAvatarCircle) {
        const firstLetter = (user.name || user.email || "G").trim().charAt(0).toUpperCase() || "G";
        userAvatarCircle.textContent = firstLetter;

        if (user.picture) {
          userAvatarCircle.style.backgroundImage = `url("${user.picture}")`;
          userAvatarCircle.style.backgroundSize = "cover";
          userAvatarCircle.style.backgroundPosition = "center";
          userAvatarCircle.style.color = "transparent";
        } else {
          userAvatarCircle.style.backgroundImage = "";
          userAvatarCircle.style.color = "";
        }
      }

      if (buyerEmailInput && !buyerEmailInput.value) {
        buyerEmailInput.value = user.email || "";
      }
    } else {
      googleSignedOutState.classList.remove("hidden");
      googleSignedInState.classList.add("hidden");

      if (userAvatarCircle) {
        userAvatarCircle.textContent = "G";
        userAvatarCircle.style.backgroundImage = "";
        userAvatarCircle.style.color = "";
      }
    }
  }

  /* =========================
     FUTURE GOOGLE SIGN-IN
     For now this is a clean placeholder.
     Later you can replace with real GIS sign-in.
  ========================= */
  function signInWithGooglePlaceholder() {
    // Future plan:
    // 1. Add Google Identity Services script in index.html
    // 2. Get credential token
    // 3. Send token to backend
    // 4. Backend verifies token and returns user profile

    // Temporary demo placeholder for product testing UI
    appState.googleUser = {
      name: "Demo Google User",
      email: buyerEmailInput?.value?.trim() || "demo.user@gmail.com",
      picture: ""
    };

    if (!appState.unlockEmail && appState.googleUser.email) {
      appState.unlockEmail = appState.googleUser.email;
    }

    saveState();
    refreshAllUI();
    setUnlockStatus("Google sign-in placeholder connected. Later replace with real Google login.");
  }

  function signOutGoogleAccount() {
    appState.googleUser = null;
    saveState();
    refreshAllUI();
    setUnlockStatus("Signed out from Google account.");
  }

  /* =========================
     VERIFY UNLOCK
  ========================= */
  async function verifyUnlock() {
    const email = buyerEmailInput ? buyerEmailInput.value.trim() : "";
    const code = unlockCodeInput ? unlockCodeInput.value.trim() : "";

    if (!email) {
      setUnlockStatus("Please enter your email.", true);
      return;
    }

    if (!code) {
      setUnlockStatus("Please enter your unlock code.", true);
      return;
    }

    appState.unlockEmail = email;
    appState.unlockCode = code;
    saveState();

    // local test mode only
    if (CONFIG.PAYMENT_MODE === "local-dev") {
      if ((CONFIG.DEV_UNLOCK_CODES || []).includes(code)) {
        appState.unlocked = true;
        saveState();
        refreshAllUI();
        setUnlockStatus("Unlocked successfully in local dev mode.");
        setTimeout(closeUnlockModal, 700);
      } else {
        setUnlockStatus("Invalid unlock code.", true);
      }
      return;
    }

    // future backend mode
    if (!CONFIG.API_BASE_URL) {
      setUnlockStatus("Auto-unlock backend is not connected yet. Later add your API base URL.", true);
      return;
    }

    try {
      verifyUnlockBtn.disabled = true;
      setUnlockStatus("Verifying unlock code...");

      const response = await fetch(CONFIG.API_BASE_URL + CONFIG.VERIFY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          code,
          googleUser: appState.googleUser
        })
      });

      let result = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (response.ok && result && result.success) {
        appState.unlocked = true;
        saveState();
        refreshAllUI();
        setUnlockStatus("Unlocked successfully.");
        setTimeout(closeUnlockModal, 700);
      } else {
        setUnlockStatus((result && result.message) || "Unlock verification failed.", true);
      }
    } catch (error) {
      console.error(error);
      setUnlockStatus("Could not connect to unlock server.", true);
    } finally {
      verifyUnlockBtn.disabled = false;
    }
  }

  /* =========================
     BUY FLOW
  ========================= */
  async function startPurchaseFlow() {
    const email = buyerEmailInput ? buyerEmailInput.value.trim() : "";

    if (email) {
      appState.unlockEmail = email;
      saveState();
    }

    // Future simple hosted checkout URL
    if (CONFIG.PAYHERE_PUBLIC_CHECKOUT_URL) {
      window.location.href = CONFIG.PAYHERE_PUBLIC_CHECKOUT_URL;
      return;
    }

    // Future backend order creation
    if (!CONFIG.API_BASE_URL) {
      setUnlockStatus("Buy flow placeholder ready. Later connect your domain, backend, and PayHere.", true);
      return;
    }

    try {
      buyNowBtn.disabled = true;
      setUnlockStatus("Creating order...");

      const response = await fetch(CONFIG.API_BASE_URL + CONFIG.CREATE_ORDER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productName: CONFIG.APP_NAME,
          amountLkr: CONFIG.PRICE_LKR,
          email: email || (appState.googleUser && appState.googleUser.email) || "",
          googleUser: appState.googleUser
        })
      });

      let result = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (response.ok && result && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setUnlockStatus((result && result.message) || "Could not start payment.", true);
      }
    } catch (error) {
      console.error(error);
      setUnlockStatus("Payment route is not connected yet.", true);
    } finally {
      buyNowBtn.disabled = false;
    }
  }

  /* =========================
     FUTURE PAYMENT RETURN HELPER
     If later you redirect back with query params like:
     ?payment=success&email=...
  ========================= */
  function checkPaymentReturnParams() {
    const url = new URL(window.location.href);
    const paymentStatus = url.searchParams.get("payment");
    const email = url.searchParams.get("email");
    const unlocked = url.searchParams.get("unlocked");

    if (email) {
      appState.unlockEmail = email;
      saveState();
    }

    if (paymentStatus === "success") {
      openUnlockModal();
      setUnlockStatus("Payment successful. Please enter the unlock code sent to your email.");
    }

    if (unlocked === "true") {
      appState.unlocked = true;
      saveState();
      refreshAllUI();
      openUnlockModal();
      setUnlockStatus("Payment confirmed. Your app is now unlocked.");
      setTimeout(closeUnlockModal, 900);
    }
  }

  /* =========================
     RESET HELPERS
     Useful for testing
  ========================= */
  function resetAppState() {
    appState = { ...defaultState };
    saveState();
    refreshAllUI();
    setUnlockStatus("App state reset.");
    if (window.QuestionSplitterApp && typeof window.QuestionSplitterApp.resetEditorStateKeepUsage === "function") {
      window.QuestionSplitterApp.resetEditorStateKeepUsage();
    }
  }

  function forceUnlockForTesting() {
    appState.unlocked = true;
    saveState();
    refreshAllUI();
    setUnlockStatus("App unlocked for testing.");
  }

  function resetFreeUsageForTesting() {
    appState.uploadsUsed = 0;
    saveState();
    refreshAllUI();
    setUnlockStatus("Free upload counter reset.");
  }

  /* =========================
     EVENT BINDING
  ========================= */
  function bindEvents() {
    if (closeUnlockModalBtn) {
      closeUnlockModalBtn.addEventListener("click", closeUnlockModal);
    }

    if (unlockModal) {
      unlockModal.addEventListener("click", (event) => {
        if (event.target === unlockModal) {
          closeUnlockModal();
        }
      });
    }

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeUnlockModal();
      }
    });

    if (verifyUnlockBtn) {
      verifyUnlockBtn.addEventListener("click", verifyUnlock);
    }

    if (buyNowBtn) {
      buyNowBtn.addEventListener("click", startPurchaseFlow);
    }

    if (googleSignInBtn) {
      googleSignInBtn.addEventListener("click", signInWithGooglePlaceholder);
    }

    if (googleSignOutBtn) {
      googleSignOutBtn.addEventListener("click", signOutGoogleAccount);
    }

    if (buyerEmailInput) {
      buyerEmailInput.addEventListener("input", () => {
        appState.unlockEmail = buyerEmailInput.value.trim();
        saveState();
      });
    }

    if (unlockCodeInput) {
      unlockCodeInput.addEventListener("input", () => {
        appState.unlockCode = unlockCodeInput.value.trim();
        saveState();
      });
    }
  }

  /* =========================
     INIT
  ========================= */
  function init() {
    bindEvents();
    refreshAllUI();
    checkPaymentReturnParams();
  }

  init();

  /* =========================
     EXPOSE GLOBAL API
  ========================= */
  window.UnlockSystem = {
    openUnlockModal,
    closeUnlockModal,
    canUseUpload,
    registerUploadUsage,
    getState,
    refreshAllUI,

    // testing helpers
    resetAppState,
    forceUnlockForTesting,
    resetFreeUsageForTesting
  };
})();