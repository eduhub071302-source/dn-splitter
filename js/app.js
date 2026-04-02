/* =========================================
   Question Splitter Pro
   Main App Logic
   - image upload
   - PDF page render
   - cut lines
   - drag lines
   - clean export
   - 3 free uploads logic hookup
========================================= */

(function () {
  "use strict";

  /* =========================
     CONFIG SAFETY
  ========================= */
  const CONFIG_SAFE = window.APP_CONFIG || {
    APP_NAME: "Question Splitter Pro",
    FREE_UPLOAD_LIMIT: 3
  };

  /* =========================
     DOM
  ========================= */
  const fileInput = document.getElementById("fileInput");
  const pdfControlsSection = document.getElementById("pdfControlsSection");
  const pdfTotalPages = document.getElementById("pdfTotalPages");
  const pdfCurrentPage = document.getElementById("pdfCurrentPage");
  const pdfPageInput = document.getElementById("pdfPageInput");
  const prevPdfPageBtn = document.getElementById("prevPdfPageBtn");
  const nextPdfPageBtn = document.getElementById("nextPdfPageBtn");
  const renderPdfPageBtn = document.getElementById("renderPdfPageBtn");

  const targetPiecesInput = document.getElementById("targetPiecesInput");
  const autoPlaceBtn = document.getElementById("autoPlaceBtn");
  const addLineBtn = document.getElementById("addLineBtn");
  const removeSelectedLineBtn = document.getElementById("removeSelectedLineBtn");
  const clearAllLinesBtn = document.getElementById("clearAllLinesBtn");
  const downloadAllBtn = document.getElementById("downloadAllBtn");

  const openUnlockBtnTop = document.getElementById("openUnlockBtnTop");
  const openUnlockBtnSide = document.getElementById("openUnlockBtnSide");

  const usageCountText = document.getElementById("usageCountText");
  const accountStatusText = document.getElementById("accountStatusText");

  const fileStatusBadge = document.getElementById("fileStatusBadge");
  const piecesCountBadge = document.getElementById("piecesCountBadge");
  const freeLimitBadge = document.getElementById("freeLimitBadge");

  const previewCanvas = document.getElementById("previewCanvas");
  const cutLinesList = document.getElementById("cutLinesList");

  const networkBanner = document.getElementById("networkBanner");
  const networkBannerText = document.getElementById("networkBannerText");
  const closeNetworkBannerBtn = document.getElementById("closeNetworkBannerBtn");

  const appLoadingOverlay = document.getElementById("appLoadingOverlay");
  const appLoadingText = document.getElementById("appLoadingText");

  if (!previewCanvas) return;
  const ctx = previewCanvas.getContext("2d");

  /* =========================
     APP STATE
  ========================= */
  const state = {
    sourceType: null, // image | pdf
    sourceFileName: "",
    imageElement: null, // original image element
    imageScale: 1, // original -> preview
    cutLines: [],
    selectedLineIndex: -1,
    draggingLineIndex: -1,
    dragPointerOffsetY: 0,
    currentPdfDoc: null,
    currentPdfPage: 1,
    totalPdfPages: 0,
    pointerDown: false
  };

  const UI = {
    emptyCanvasWidth: 1000,
    emptyCanvasHeight: 1400,
    maxPreviewWidthDesktop: 1100,
    maxPreviewWidthMobile: 700,
    minLineYMargin: 10,
    lineHitTolerance: 14
  };

  /* =========================
     HELPERS
  ========================= */
  function showLoading(text = "Loading...") {
    if (!appLoadingOverlay) return;
    appLoadingText.textContent = text;
    appLoadingOverlay.classList.remove("hidden");
  }

  function hideLoading() {
    if (!appLoadingOverlay) return;
    appLoadingOverlay.classList.add("hidden");
  }

  function setBadgeText(el, text) {
    if (el) el.textContent = text;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isMobileWidth() {
    return window.innerWidth < 768;
  }

  function getPreviewMaxWidth() {
    return isMobileWidth() ? UI.maxPreviewWidthMobile : UI.maxPreviewWidthDesktop;
  }

  function sortCutLines() {
    state.cutLines.sort((a, b) => a - b);
  }

  function getUnlockedState() {
    if (window.UnlockSystem && typeof window.UnlockSystem.getState === "function") {
      return window.UnlockSystem.getState();
    }
    return {
      uploadsUsed: 0,
      unlocked: false
    };
  }

  function refreshUsageUI() {
    const unlockState = getUnlockedState();
    const used = unlockState.uploadsUsed || 0;
    const unlocked = !!unlockState.unlocked;

    setBadgeText(usageCountText, `${used} / ${CONFIG_SAFE.FREE_UPLOAD_LIMIT}`);
    setBadgeText(accountStatusText, unlocked ? "Unlocked" : "Free");
    setBadgeText(
      freeLimitBadge,
      unlocked ? "Unlimited unlocked" : `Free limit: ${CONFIG_SAFE.FREE_UPLOAD_LIMIT} uploads`
    );
  }

  function updatePiecesCount() {
    const pieces = state.imageElement ? state.cutLines.length + 1 : 0;
    setBadgeText(piecesCountBadge, `Pieces: ${pieces}`);
  }

  function updateFileStatus(text) {
    setBadgeText(fileStatusBadge, text);
  }

  function openUnlockModalSafe() {
    if (window.UnlockSystem && typeof window.UnlockSystem.openUnlockModal === "function") {
      window.UnlockSystem.openUnlockModal();
    }
  }

  function canUseAnotherUpload() {
    if (window.UnlockSystem && typeof window.UnlockSystem.canUseUpload === "function") {
      return window.UnlockSystem.canUseUpload();
    }
    return true;
  }

  function registerUploadUsage() {
    if (window.UnlockSystem && typeof window.UnlockSystem.registerUploadUsage === "function") {
      window.UnlockSystem.registerUploadUsage();
    }
    refreshUsageUI();
  }

  function showNetworkBanner(text) {
    if (!networkBanner || !networkBannerText) return;
    networkBannerText.textContent = text;
    networkBanner.classList.remove("hidden");
  }

  function hideNetworkBanner() {
    if (!networkBanner) return;
    networkBanner.classList.add("hidden");
  }

  function clearFileInput() {
    if (fileInput) fileInput.value = "";
  }

  function resetEditorStateKeepUsage() {
    state.sourceType = null;
    state.sourceFileName = "";
    state.imageElement = null;
    state.imageScale = 1;
    state.cutLines = [];
    state.selectedLineIndex = -1;
    state.draggingLineIndex = -1;
    state.dragPointerOffsetY = 0;
    state.currentPdfDoc = null;
    state.currentPdfPage = 1;
    state.totalPdfPages = 0;

    if (pdfControlsSection) pdfControlsSection.classList.add("hidden");
    if (pdfTotalPages) pdfTotalPages.textContent = "0";
    if (pdfCurrentPage) pdfCurrentPage.textContent = "0";
    if (pdfPageInput) pdfPageInput.value = "1";

    renderEmptyCanvas();
    updateCutLinesList();
    updatePiecesCount();
    updateFileStatus("No file loaded");
  }

  /* =========================
     EMPTY CANVAS
  ========================= */
  function renderEmptyCanvas() {
    previewCanvas.width = UI.emptyCanvasWidth;
    previewCanvas.height = UI.emptyCanvasHeight;

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.fillStyle = "#091423";
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

    ctx.textAlign = "center";
    ctx.fillStyle = "#9db1d3";
    ctx.font = "bold 34px Arial";
    ctx.fillText("Upload an image or PDF to start", previewCanvas.width / 2, previewCanvas.height / 2 - 18);

    ctx.font = "22px Arial";
    ctx.fillText("Preview will appear here", previewCanvas.width / 2, previewCanvas.height / 2 + 26);
  }

  /* =========================
     IMAGE LOADING
  ========================= */
  function renderImageToPreview(imgEl, fileName = "Image") {
    state.imageElement = imgEl;
    state.sourceFileName = fileName;

    const maxPreviewWidth = getPreviewMaxWidth();
    state.imageScale = Math.min(1, maxPreviewWidth / imgEl.naturalWidth);

    previewCanvas.width = Math.round(imgEl.naturalWidth * state.imageScale);
    previewCanvas.height = Math.round(imgEl.naturalHeight * state.imageScale);

    state.cutLines = [];
    state.selectedLineIndex = -1;
    state.draggingLineIndex = -1;

    drawPreview();
    updateCutLinesList();
    updatePiecesCount();
    updateFileStatus(`${fileName} loaded`);
  }

  function loadImageFile(file) {
    showLoading("Loading image...");
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = function () {
      state.sourceType = "image";
      renderImageToPreview(img, file.name);
      hideLoading();
    };

    img.onerror = function () {
      hideLoading();
      alert("Could not load the selected image.");
    };

    img.src = imageUrl;
  }

  /* =========================
     PDF LOADING
  ========================= */
  async function loadPdfFile(file) {
    if (!window.pdfjsLib) {
      alert("PDF support is not ready. Please add PDF.js files correctly.");
      return;
    }

    showLoading("Reading PDF...");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      state.sourceType = "pdf";
      state.sourceFileName = file.name;
      state.currentPdfDoc = pdf;
      state.totalPdfPages = pdf.numPages;
      state.currentPdfPage = 1;

      pdfControlsSection.classList.remove("hidden");
      pdfTotalPages.textContent = String(pdf.numPages);
      pdfCurrentPage.textContent = "1";
      pdfPageInput.max = String(pdf.numPages);
      pdfPageInput.value = "1";

      await renderCurrentPdfPage();
    } catch (error) {
      console.error(error);
      alert("Could not load the PDF.");
    } finally {
      hideLoading();
    }
  }

  async function renderCurrentPdfPage() {
    if (!state.currentPdfDoc) return;

    showLoading(`Rendering PDF page ${state.currentPdfPage}...`);
    try {
      const page = await state.currentPdfDoc.getPage(state.currentPdfPage);

      const baseViewport = page.getViewport({ scale: 1 });
      const desiredMaxWidth = 1600;
      const renderScale = desiredMaxWidth / baseViewport.width;

      const viewport = page.getViewport({ scale: renderScale });

      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");

      tempCanvas.width = Math.round(viewport.width);
      tempCanvas.height = Math.round(viewport.height);

      await page.render({
        canvasContext: tempCtx,
        viewport
      }).promise;

      const img = new Image();
      img.src = tempCanvas.toDataURL("image/png");

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      renderImageToPreview(img, `${state.sourceFileName} - Page ${state.currentPdfPage}`);
      pdfCurrentPage.textContent = String(state.currentPdfPage);
      pdfPageInput.value = String(state.currentPdfPage);
      updateFileStatus(`${state.sourceFileName} - Page ${state.currentPdfPage} loaded`);
    } catch (error) {
      console.error(error);
      alert("Could not render this PDF page.");
    } finally {
      hideLoading();
    }
  }

  /* =========================
     DRAW PREVIEW
  ========================= */
  function drawPreview() {
    if (!state.imageElement) {
      renderEmptyCanvas();
      return;
    }

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.drawImage(state.imageElement, 0, 0, previewCanvas.width, previewCanvas.height);

    state.cutLines.forEach((lineY, index) => {
      const selected = index === state.selectedLineIndex;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = selected ? 4 : 3;
      ctx.strokeStyle = selected ? "#ffd166" : "#58a6ff";
      ctx.moveTo(0, lineY);
      ctx.lineTo(previewCanvas.width, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      const tagWidth = 72;
      const tagHeight = 30;
      const tagX = previewCanvas.width - tagWidth - 12;
      const tagY = lineY - tagHeight / 2;

      ctx.fillStyle = selected ? "#ffd166" : "#58a6ff";
      roundRect(ctx, tagX, tagY, tagWidth, tagHeight, 8, true, false);

      ctx.fillStyle = "#081322";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 15px Arial";
      ctx.fillText(`#${index + 1}`, tagX + tagWidth / 2, tagY + tagHeight / 2 + 1);
      ctx.restore();
    });

    updatePiecesCount();
  }

  function roundRect(context, x, y, width, height, radius, fill, stroke) {
    let r = radius;
    if (typeof r === "number") {
      r = { tl: r, tr: r, br: r, bl: r };
    }
    context.beginPath();
    context.moveTo(x + r.tl, y);
    context.lineTo(x + width - r.tr, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r.tr);
    context.lineTo(x + width, y + height - r.br);
    context.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
    context.lineTo(x + r.bl, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r.bl);
    context.lineTo(x, y + r.tl);
    context.quadraticCurveTo(x, y, x + r.tl, y);
    context.closePath();
    if (fill) context.fill();
    if (stroke) context.stroke();
  }

  /* =========================
     CUT LINE LIST
  ========================= */
  function updateCutLinesList() {
    if (!cutLinesList) return;

    if (!state.cutLines.length) {
      cutLinesList.innerHTML = `<div class="empty-list-text">No cut lines yet</div>`;
      return;
    }

    cutLinesList.innerHTML = "";
    state.cutLines.forEach((lineY, index) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "cut-line-item";
      row.style.width = "100%";
      row.style.textAlign = "left";
      row.style.background = index === state.selectedLineIndex ? "rgba(88,166,255,0.16)" : "rgba(255,255,255,0.04)";
      row.style.border = "1px solid rgba(255,255,255,0.08)";
      row.style.borderRadius = "12px";
      row.style.padding = "10px 12px";
      row.style.color = "#eaf2ff";
      row.style.marginBottom = "8px";
      row.style.cursor = "pointer";

      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <strong>Line ${index + 1}</strong>
          <span style="color:#9db1d3; font-size:12px;">Y: ${Math.round(lineY)} px</span>
        </div>
      `;

      row.addEventListener("click", () => {
        state.selectedLineIndex = index;
        drawPreview();
        updateCutLinesList();
      });

      cutLinesList.appendChild(row);
    });
  }

  /* =========================
     CUT LINE LOGIC
  ========================= */
  function addCutLine(y = null) {
    if (!state.imageElement) return;

    const newY = y === null
      ? Math.round(previewCanvas.height / 2)
      : clamp(Math.round(y), UI.minLineYMargin, previewCanvas.height - UI.minLineYMargin);

    state.cutLines.push(newY);
    sortCutLines();
    state.selectedLineIndex = state.cutLines.findIndex((v) => v === newY);

    drawPreview();
    updateCutLinesList();
  }

  function removeSelectedCutLine() {
    if (state.selectedLineIndex < 0) return;

    state.cutLines.splice(state.selectedLineIndex, 1);
    if (state.selectedLineIndex >= state.cutLines.length) {
      state.selectedLineIndex = state.cutLines.length - 1;
    }

    drawPreview();
    updateCutLinesList();
  }

  function clearAllCutLines() {
    state.cutLines = [];
    state.selectedLineIndex = -1;
    drawPreview();
    updateCutLinesList();
  }

  function autoPlaceCutLines() {
    if (!state.imageElement) return;

    const pieces = parseInt(targetPiecesInput.value, 10);
    if (!Number.isFinite(pieces) || pieces < 2) {
      alert("Please enter a valid target piece count.");
      return;
    }

    state.cutLines = [];
    const cutCount = pieces - 1;

    for (let i = 1; i <= cutCount; i++) {
      state.cutLines.push((previewCanvas.height / pieces) * i);
    }

    state.cutLines = state.cutLines.map((v) =>
      clamp(Math.round(v), UI.minLineYMargin, previewCanvas.height - UI.minLineYMargin)
    );

    state.selectedLineIndex = state.cutLines.length ? 0 : -1;
    drawPreview();
    updateCutLinesList();
  }

  function findLineIndexNearY(y) {
    for (let i = 0; i < state.cutLines.length; i++) {
      if (Math.abs(state.cutLines[i] - y) <= UI.lineHitTolerance) {
        return i;
      }
    }
    return -1;
  }

  function findClosestLineIndex(targetY) {
    let bestIndex = -1;
    let bestDistance = Infinity;

    state.cutLines.forEach((lineY, index) => {
      const distance = Math.abs(lineY - targetY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  /* =========================
     POINTER HELPERS
  ========================= */
  function getCanvasPointFromEvent(event) {
    const rect = previewCanvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if (event.changedTouches && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function onPointerStart(event) {
    if (!state.imageElement) return;

    if (event.cancelable) event.preventDefault();

    state.pointerDown = true;
    const point = getCanvasPointFromEvent(event);
    const hitIndex = findLineIndexNearY(point.y);

    if (hitIndex >= 0) {
      state.selectedLineIndex = hitIndex;
      state.draggingLineIndex = hitIndex;
      state.dragPointerOffsetY = point.y - state.cutLines[hitIndex];
    } else {
      addCutLine(point.y);
      state.draggingLineIndex = -1;
      state.dragPointerOffsetY = 0;
    }

    drawPreview();
    updateCutLinesList();
  }

  function onPointerMove(event) {
    if (!state.imageElement || !state.pointerDown || state.draggingLineIndex < 0) return;

    if (event.cancelable) event.preventDefault();

    const point = getCanvasPointFromEvent(event);
    const adjustedY = point.y - state.dragPointerOffsetY;
    state.cutLines[state.draggingLineIndex] = clamp(
      Math.round(adjustedY),
      UI.minLineYMargin,
      previewCanvas.height - UI.minLineYMargin
    );

    sortCutLines();
    state.selectedLineIndex = findClosestLineIndex(state.cutLines[state.draggingLineIndex]);
    drawPreview();
    updateCutLinesList();
  }

  function onPointerEnd(event) {
    if (event && event.cancelable) {
      event.preventDefault();
    }
    state.pointerDown = false;
    state.draggingLineIndex = -1;
    state.dragPointerOffsetY = 0;
  }

  /* =========================
     EXPORT
  ========================= */
  function exportAllPieces() {
    if (!state.imageElement) {
      alert("Please upload an image or PDF first.");
      return;
    }

    const unlockState = getUnlockedState();
    if (!unlockState.unlocked && (unlockState.uploadsUsed || 0) > CONFIG_SAFE.FREE_UPLOAD_LIMIT) {
      openUnlockModalSafe();
      return;
    }

    const sortedBoundaries = [0, ...state.cutLines.slice().sort((a, b) => a - b), previewCanvas.height];

    let clickDelay = 0;
    for (let i = 0; i < sortedBoundaries.length - 1; i++) {
      const topPreviewY = Math.round(sortedBoundaries[i]);
      const bottomPreviewY = Math.round(sortedBoundaries[i + 1]);
      const previewSliceHeight = bottomPreviewY - topPreviewY;

      if (previewSliceHeight <= 2) continue;

      const sourceY = Math.round(topPreviewY / state.imageScale);
      const sourceHeight = Math.round(previewSliceHeight / state.imageScale);

      const exportCanvas = document.createElement("canvas");
      const exportCtx = exportCanvas.getContext("2d");

      exportCanvas.width = state.imageElement.naturalWidth;
      exportCanvas.height = sourceHeight;

      exportCtx.drawImage(
        state.imageElement,
        0,
        sourceY,
        state.imageElement.naturalWidth,
        sourceHeight,
        0,
        0,
        state.imageElement.naturalWidth,
        sourceHeight
      );

      const link = document.createElement("a");
      link.href = exportCanvas.toDataURL("image/png");
      link.download = buildExportFileName(i + 1);

      setTimeout(() => {
        link.click();
      }, clickDelay);

      clickDelay += 180;
    }
  }

  function buildExportFileName(index) {
    const cleanBase = (state.sourceFileName || "split")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^\w\-]+/g, "-");

    return `${cleanBase}-part-${String(index).padStart(2, "0")}.png`;
  }

  /* =========================
     FILE HANDLER
  ========================= */
  async function handleFileSelection(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!canUseAnotherUpload()) {
      clearFileInput();
      openUnlockModalSafe();
      return;
    }

    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      alert("Please choose a supported image or PDF file.");
      clearFileInput();
      return;
    }

    registerUploadUsage();
    refreshUsageUI();

    if (isPdf) {
      await loadPdfFile(file);
    } else {
      if (pdfControlsSection) pdfControlsSection.classList.add("hidden");
      loadImageFile(file);
    }
  }

  /* =========================
     PDF PAGE CONTROLS
  ========================= */
  function goToPdfPage(pageNumber) {
    if (!state.currentPdfDoc) return;

    const page = clamp(
      parseInt(pageNumber, 10) || 1,
      1,
      state.totalPdfPages
    );

    state.currentPdfPage = page;
    renderCurrentPdfPage();
  }

  /* =========================
     NETWORK UI
  ========================= */
  function handleOnlineStatus() {
    if (navigator.onLine) {
      showNetworkBanner("Back online");
      setTimeout(hideNetworkBanner, 1800);
    } else {
      showNetworkBanner("You are offline");
    }
  }

  /* =========================
     EVENT BINDING
  ========================= */
  function bindEvents() {
    if (fileInput) {
      fileInput.addEventListener("change", handleFileSelection);
    }

    if (autoPlaceBtn) autoPlaceBtn.addEventListener("click", autoPlaceCutLines);
    if (addLineBtn) addLineBtn.addEventListener("click", () => addCutLine());
    if (removeSelectedLineBtn) removeSelectedLineBtn.addEventListener("click", removeSelectedCutLine);
    if (clearAllLinesBtn) clearAllLinesBtn.addEventListener("click", clearAllCutLines);
    if (downloadAllBtn) downloadAllBtn.addEventListener("click", exportAllPieces);

    if (openUnlockBtnTop) openUnlockBtnTop.addEventListener("click", openUnlockModalSafe);
    if (openUnlockBtnSide) openUnlockBtnSide.addEventListener("click", openUnlockModalSafe);

    if (prevPdfPageBtn) {
      prevPdfPageBtn.addEventListener("click", () => {
        if (!state.currentPdfDoc) return;
        goToPdfPage(state.currentPdfPage - 1);
      });
    }

    if (nextPdfPageBtn) {
      nextPdfPageBtn.addEventListener("click", () => {
        if (!state.currentPdfDoc) return;
        goToPdfPage(state.currentPdfPage + 1);
      });
    }

    if (renderPdfPageBtn) {
      renderPdfPageBtn.addEventListener("click", () => {
        if (!state.currentPdfDoc) return;
        goToPdfPage(pdfPageInput.value);
      });
    }

    if (pdfPageInput) {
      pdfPageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          goToPdfPage(pdfPageInput.value);
        }
      });
    }

    previewCanvas.addEventListener("mousedown", onPointerStart);
    previewCanvas.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerEnd);

    previewCanvas.addEventListener("touchstart", onPointerStart, { passive: false });
    previewCanvas.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerEnd, { passive: false });
    window.addEventListener("touchcancel", onPointerEnd, { passive: false });

    window.addEventListener("resize", () => {
      if (state.imageElement) {
        renderImageToPreview(state.imageElement, state.sourceFileName);
        if (state.cutLines.length) {
          // keep old lines proportionally after resize
          // renderImageToPreview resets lines, so restore them
        }
      } else {
        renderEmptyCanvas();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Delete") {
        removeSelectedCutLine();
      }
    });

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    if (closeNetworkBannerBtn) {
      closeNetworkBannerBtn.addEventListener("click", hideNetworkBanner);
    }
  }

  /* =========================
     PRESERVE CUTS ON RESIZE
  ========================= */
  function reRenderWithResponsiveScale() {
    if (!state.imageElement) {
      renderEmptyCanvas();
      return;
    }

    const oldHeight = previewCanvas.height || 1;
    const oldLines = state.cutLines.slice();
    const oldSelectedIndex = state.selectedLineIndex;

    const maxPreviewWidth = getPreviewMaxWidth();
    state.imageScale = Math.min(1, maxPreviewWidth / state.imageElement.naturalWidth);

    previewCanvas.width = Math.round(state.imageElement.naturalWidth * state.imageScale);
    previewCanvas.height = Math.round(state.imageElement.naturalHeight * state.imageScale);

    state.cutLines = oldLines.map((lineY) =>
      clamp(
        Math.round((lineY / oldHeight) * previewCanvas.height),
        UI.minLineYMargin,
        previewCanvas.height - UI.minLineYMargin
      )
    );
    state.selectedLineIndex = oldSelectedIndex >= state.cutLines.length ? state.cutLines.length - 1 : oldSelectedIndex;

    drawPreview();
    updateCutLinesList();
  }

  /* =========================
     PWA INSTALL HOOK
  ========================= */
  function bindInstallPrompt() {
    const installBtn = document.getElementById("installBtn");
    let deferredPrompt = null;

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      if (installBtn) {
        installBtn.classList.remove("hidden");
      }
    });

    if (installBtn) {
      installBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        try {
          await deferredPrompt.userChoice;
        } catch (error) {
          console.error(error);
        }
        deferredPrompt = null;
        installBtn.classList.add("hidden");
      });
    }

    window.addEventListener("appinstalled", () => {
      if (installBtn) installBtn.classList.add("hidden");
    });
  }

  /* =========================
     SERVICE WORKER REGISTER
  ========================= */
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch((error) => {
          console.error("Service worker registration failed:", error);
        });
      });
    }
  }

  /* =========================
     INIT
  ========================= */
  function init() {
    renderEmptyCanvas();
    refreshUsageUI();
    updatePiecesCount();
    bindEvents();
    bindInstallPrompt();
    registerServiceWorker();
    handleOnlineStatus();

    const originalResizeHandler = window.onresize;
    window.addEventListener("resize", () => {
      if (typeof originalResizeHandler === "function") {
        originalResizeHandler();
      }
      reRenderWithResponsiveScale();
    });
  }

  init();

  /* =========================
     OPTIONAL GLOBALS
  ========================= */
  window.QuestionSplitterApp = {
    refreshUsageUI,
    resetEditorStateKeepUsage,
    renderEmptyCanvas
  };
})();