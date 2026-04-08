/* =========================================
   Question Splitter Pro
   Main App Logic
   - image upload
   - PDF page render
   - cut lines
   - drag lines
   - clean export
   - rotation control
   - output settings
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

  const rotationAngleText = document.getElementById("rotationAngleText");
  const rotateLeftBtn = document.getElementById("rotateLeftBtn");
  const rotateRightBtn = document.getElementById("rotateRightBtn");
  const rotateLeftFastBtn = document.getElementById("rotateLeftFastBtn");
  const rotateRightFastBtn = document.getElementById("rotateRightFastBtn");
  const resetRotationBtn = document.getElementById("resetRotationBtn");

  const outputPrefixInput = document.getElementById("outputPrefixInput");
  const outputStartNumberInput = document.getElementById("outputStartNumberInput");
  const outputFormatSelect = document.getElementById("outputFormatSelect");
  const outputQualityRange = document.getElementById("outputQualityRange");
  const outputQualityText = document.getElementById("outputQualityText");
  const outputExampleText = document.getElementById("outputExampleText");
  const qualitySection = document.getElementById("qualitySection");

  if (!previewCanvas) return;
  const ctx = previewCanvas.getContext("2d");

  /* =========================
     APP STATE
  ========================= */
  const state = {
    sourceType: null,
    sourceFileName: "",
    imageElement: null,
    rotatedImageElement: null,
    imageScale: 1,
    cutLines: [],
    selectedLineIndex: -1,
    draggingLineIndex: -1,
    dragPointerOffsetY: 0,
    currentPdfDoc: null,
    currentPdfPage: 1,
    totalPdfPages: 0,
    pointerDown: false,

    rotationAngle: 0,
    rotationHoldTimer: null,
    rotationHoldInterval: null,
    rotationBusy: false,
    queuedRotationDelta: 0,

    outputPrefix: "q",
    outputStartNumber: 1,
    outputFormat: "jpg",
    outputQuality: 0.95
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
    if (appLoadingText) appLoadingText.textContent = text;
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

  function normalizeAngle(angle) {
    let a = angle;
    while (a > 180) a -= 360;
    while (a <= -180) a += 360;
    return Number(a.toFixed(1));
  }

  function degreesToRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  function sanitizePrefix(prefix) {
    const safe = String(prefix || "")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, "");
    return safe || "q";
  }

  function getOutputExtension() {
    if (state.outputFormat === "jpg") return "jpg";
    if (state.outputFormat === "png") return "png";
    if (state.outputFormat === "webp") return "webp";
    return "jpg";
  }

  function getMimeTypeFromFormat(format) {
    if (format === "png") return "image/png";
    if (format === "webp") return "image/webp";
    return "image/jpeg";
  }

  function shouldUseQuality(format) {
    return format === "jpg" || format === "webp";
  }

  function updateOutputUI() {
    state.outputPrefix = sanitizePrefix(outputPrefixInput ? outputPrefixInput.value : "q");

    const parsedStart = parseInt(outputStartNumberInput ? outputStartNumberInput.value : "1", 10);
    state.outputStartNumber = Number.isFinite(parsedStart) ? Math.max(0, parsedStart) : 1;

    state.outputFormat = outputFormatSelect ? outputFormatSelect.value : "jpg";
    state.outputQuality = (outputQualityRange ? Number(outputQualityRange.value) : 95) / 100;

    if (outputQualityText) {
      outputQualityText.textContent = `${Math.round(state.outputQuality * 100)}%`;
    }

    if (qualitySection) {
      qualitySection.classList.toggle("hidden", !shouldUseQuality(state.outputFormat));
    }

    if (outputExampleText) {
      outputExampleText.textContent = `${state.outputPrefix}${state.outputStartNumber}.${getOutputExtension()}`;
    }
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
    const pieces = getActiveDisplayImage() ? state.cutLines.length + 1 : 0;
    setBadgeText(piecesCountBadge, `Pieces: ${pieces}`);
  }

  function updateFileStatus(text) {
    setBadgeText(fileStatusBadge, text);
  }

  function updateRotationUI() {
    if (rotationAngleText) {
      rotationAngleText.textContent = `${state.rotationAngle.toFixed(1)}°`;
    }
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

  function stopRotationHold() {
    if (state.rotationHoldTimer) {
      clearTimeout(state.rotationHoldTimer);
      state.rotationHoldTimer = null;
    }

    if (state.rotationHoldInterval) {
      clearInterval(state.rotationHoldInterval);
      state.rotationHoldInterval = null;
    }
  }

  function getActiveDisplayImage() {
    return state.rotatedImageElement || state.imageElement;
  }

  function resetEditorStateKeepUsage() {
    stopRotationHold();

    state.sourceType = null;
    state.sourceFileName = "";
    state.imageElement = null;
    state.rotatedImageElement = null;
    state.imageScale = 1;
    state.cutLines = [];
    state.selectedLineIndex = -1;
    state.draggingLineIndex = -1;
    state.dragPointerOffsetY = 0;
    state.currentPdfDoc = null;
    state.currentPdfPage = 1;
    state.totalPdfPages = 0;
    state.pointerDown = false;
    state.rotationAngle = 0;
    state.rotationBusy = false;
    state.queuedRotationDelta = 0;

    if (pdfControlsSection) pdfControlsSection.classList.add("hidden");
    if (pdfTotalPages) pdfTotalPages.textContent = "0";
    if (pdfCurrentPage) pdfCurrentPage.textContent = "0";
    if (pdfPageInput) pdfPageInput.value = "1";

    renderEmptyCanvas();
    updateCutLinesList();
    updatePiecesCount();
    updateFileStatus("No file loaded");
    updateRotationUI();
    updateOutputUI();
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
     ROTATION
  ========================= */
  function createRotatedImageFromBase(baseImage, angleDeg) {
    return new Promise((resolve, reject) => {
      const rad = degreesToRadians(angleDeg);

      const srcW = baseImage.naturalWidth || baseImage.width;
      const srcH = baseImage.naturalHeight || baseImage.height;

      const absCos = Math.abs(Math.cos(rad));
      const absSin = Math.abs(Math.sin(rad));

      const outW = Math.ceil(srcW * absCos + srcH * absSin);
      const outH = Math.ceil(srcW * absSin + srcH * absCos);

      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");

      tempCanvas.width = outW;
      tempCanvas.height = outH;

      tempCtx.fillStyle = "#ffffff";
      tempCtx.fillRect(0, 0, outW, outH);

      tempCtx.translate(outW / 2, outH / 2);
      tempCtx.rotate(rad);
      tempCtx.drawImage(baseImage, -srcW / 2, -srcH / 2);

      const rotatedImg = new Image();
      rotatedImg.onload = () => resolve(rotatedImg);
      rotatedImg.onerror = reject;
      rotatedImg.src = tempCanvas.toDataURL("image/png");
    });
  }

  async function renderRotationAtCurrentAngle() {
    if (!state.imageElement) return;

    const oldHeight = previewCanvas.height || 1;
    const oldLines = state.cutLines.slice();
    const oldSelectedIndex = state.selectedLineIndex;

    if (Math.abs(state.rotationAngle) < 0.0001) {
      state.rotatedImageElement = null;
    } else {
      state.rotatedImageElement = await createRotatedImageFromBase(state.imageElement, state.rotationAngle);
    }

    const displayImage = getActiveDisplayImage();
    const maxPreviewWidth = getPreviewMaxWidth();
    state.imageScale = Math.min(1, maxPreviewWidth / displayImage.naturalWidth);

    previewCanvas.width = Math.round(displayImage.naturalWidth * state.imageScale);
    previewCanvas.height = Math.round(displayImage.naturalHeight * state.imageScale);

    state.cutLines = oldLines.map((lineY) =>
      clamp(
        Math.round((lineY / oldHeight) * previewCanvas.height),
        UI.minLineYMargin,
        previewCanvas.height - UI.minLineYMargin
      )
    );

    state.selectedLineIndex =
      oldSelectedIndex >= state.cutLines.length ? state.cutLines.length - 1 : oldSelectedIndex;

    drawPreview();
    updateCutLinesList();
    updatePiecesCount();
    updateRotationUI();
  }

  async function processQueuedRotation() {
    if (state.rotationBusy) return;
    if (!state.imageElement) return;

    state.rotationBusy = true;
    showLoading("Rotating image...");

    try {
      while (Math.abs(state.queuedRotationDelta) > 0.00001) {
        const delta = state.queuedRotationDelta;
        state.queuedRotationDelta = 0;
        state.rotationAngle = normalizeAngle(state.rotationAngle + delta);
        await renderRotationAtCurrentAngle();
      }
    } catch (error) {
      console.error(error);
      alert("Could not rotate image.");
    } finally {
      state.rotationBusy = false;
      hideLoading();
    }
  }

  function queueRotation(angleDelta) {
    if (!state.imageElement) return;
    state.queuedRotationDelta = Number((state.queuedRotationDelta + angleDelta).toFixed(4));
    processQueuedRotation();
  }

  function startRotationHold(step) {
    if (!state.imageElement) return;

    stopRotationHold();
    queueRotation(step);

    state.rotationHoldTimer = setTimeout(() => {
      state.rotationHoldInterval = setInterval(() => {
        queueRotation(step);
      }, 80);
    }, 300);
  }

  function resetRotation() {
    if (!state.imageElement) return;
    stopRotationHold();
    state.rotationAngle = 0;
    state.queuedRotationDelta = 0;
    showLoading("Resetting rotation...");

    Promise.resolve()
      .then(() => renderRotationAtCurrentAngle())
      .catch((error) => {
        console.error(error);
        alert("Could not reset rotation.");
      })
      .finally(() => {
        hideLoading();
      });
  }

  /* =========================
     IMAGE LOADING
  ========================= */
  function renderImageToPreview(imgEl, fileName = "Image") {
    stopRotationHold();

    state.imageElement = imgEl;
    state.rotatedImageElement = null;
    state.rotationAngle = 0;
    state.queuedRotationDelta = 0;
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
    updateRotationUI();
  }

  function loadImageFile(file) {
    showLoading("Loading image...");
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = function () {
      state.sourceType = "image";
      renderImageToPreview(img, file.name);
      hideLoading();
      URL.revokeObjectURL(imageUrl);
    };

    img.onerror = function () {
      hideLoading();
      alert("Could not load the selected image.");
      URL.revokeObjectURL(imageUrl);
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

      if (pdfControlsSection) pdfControlsSection.classList.remove("hidden");
      if (pdfTotalPages) pdfTotalPages.textContent = String(pdf.numPages);
      if (pdfCurrentPage) pdfCurrentPage.textContent = "1";
      if (pdfPageInput) {
        pdfPageInput.max = String(pdf.numPages);
        pdfPageInput.value = "1";
      }

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

      if (pdfCurrentPage) pdfCurrentPage.textContent = String(state.currentPdfPage);
      if (pdfPageInput) pdfPageInput.value = String(state.currentPdfPage);

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
    const displayImage = getActiveDisplayImage();

    if (!displayImage) {
      renderEmptyCanvas();
      return;
    }

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.drawImage(displayImage, 0, 0, previewCanvas.width, previewCanvas.height);

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

      const fileNumber = state.outputStartNumber + index;
      const exampleName = `${state.outputPrefix}${fileNumber}.${getOutputExtension()}`;

      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <strong>Line ${index + 1}</strong>
          <span style="color:#9db1d3; font-size:12px;">Y: ${Math.round(lineY)} px</span>
        </div>
        <div style="margin-top:6px; color:#7de3ff; font-size:12px;">Next file around here: ${exampleName}</div>
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
    if (!getActiveDisplayImage()) return;

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
    if (!getActiveDisplayImage()) return;

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
    if (!getActiveDisplayImage()) return;

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
    if (!getActiveDisplayImage() || !state.pointerDown || state.draggingLineIndex < 0) return;

    if (event.cancelable) event.preventDefault();

    const point = getCanvasPointFromEvent(event);
    const adjustedY = point.y - state.dragPointerOffsetY;
    state.cutLines[state.draggingLineIndex] = clamp(
      Math.round(adjustedY),
      UI.minLineYMargin,
      previewCanvas.height - UI.minLineYMargin
    );

    sortCutLines();
    state.selectedLineIndex = state.draggingLineIndex;

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
  function buildExportFileName(index) {
    const outputNumber = state.outputStartNumber + index - 1;
    const prefix = sanitizePrefix(state.outputPrefix);
    const ext = getOutputExtension();
    return `${prefix}${outputNumber}.${ext}`;
  }

  function exportAllPieces() {
    updateOutputUI();

    const exportImage = getActiveDisplayImage();

    if (!exportImage) {
      alert("Please upload an image or PDF first.");
      return;
    }

    const unlockState = getUnlockedState();
    if (!unlockState.unlocked && (unlockState.uploadsUsed || 0) > CONFIG_SAFE.FREE_UPLOAD_LIMIT) {
      openUnlockModalSafe();
      return;
    }

    const sortedBoundaries = [0, ...state.cutLines.slice().sort((a, b) => a - b), previewCanvas.height];
    const mimeType = getMimeTypeFromFormat(state.outputFormat);

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

      exportCanvas.width = exportImage.naturalWidth;
      exportCanvas.height = sourceHeight;

      exportCtx.fillStyle = "#ffffff";
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      exportCtx.drawImage(
        exportImage,
        0,
        sourceY,
        exportImage.naturalWidth,
        sourceHeight,
        0,
        0,
        exportImage.naturalWidth,
        sourceHeight
      );

      const link = document.createElement("a");

      if (shouldUseQuality(state.outputFormat)) {
        link.href = exportCanvas.toDataURL(mimeType, state.outputQuality);
      } else {
        link.href = exportCanvas.toDataURL(mimeType);
      }

      link.download = buildExportFileName(i + 1);

      setTimeout(() => {
        link.click();
      }, clickDelay);

      clickDelay += 180;
    }
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
     RESPONSIVE RE-RENDER
  ========================= */
  function reRenderWithResponsiveScale() {
    const displayImage = getActiveDisplayImage();

    if (!displayImage) {
      renderEmptyCanvas();
      return;
    }

    const oldHeight = previewCanvas.height || 1;
    const oldLines = state.cutLines.slice();
    const oldSelectedIndex = state.selectedLineIndex;

    const maxPreviewWidth = getPreviewMaxWidth();
    state.imageScale = Math.min(1, maxPreviewWidth / displayImage.naturalWidth);

    previewCanvas.width = Math.round(displayImage.naturalWidth * state.imageScale);
    previewCanvas.height = Math.round(displayImage.naturalHeight * state.imageScale);

    state.cutLines = oldLines.map((lineY) =>
      clamp(
        Math.round((lineY / oldHeight) * previewCanvas.height),
        UI.minLineYMargin,
        previewCanvas.height - UI.minLineYMargin
      )
    );

    state.selectedLineIndex =
      oldSelectedIndex >= state.cutLines.length ? state.cutLines.length - 1 : oldSelectedIndex;

    drawPreview();
    updateCutLinesList();
    updateRotationUI();
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
     ROTATION BUTTON EVENTS
  ========================= */
  function bindHoldRotation(button, step) {
    if (!button) return;

    const start = (event) => {
      if (!state.imageElement) return;
      if (event.cancelable) event.preventDefault();
      startRotationHold(step);
    };

    const stop = () => stopRotationHold();

    button.addEventListener("mousedown", start);
    button.addEventListener("touchstart", start, { passive: false });

    button.addEventListener("mouseup", stop);
    button.addEventListener("mouseleave", stop);
    button.addEventListener("touchend", stop);
    button.addEventListener("touchcancel", stop);
  }

  /* =========================
     OUTPUT SETTINGS EVENTS
  ========================= */
  function bindOutputSettingsEvents() {
    [outputPrefixInput, outputStartNumberInput, outputFormatSelect, outputQualityRange].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", () => {
        updateOutputUI();
        updateCutLinesList();
      });
      el.addEventListener("change", () => {
        updateOutputUI();
        updateCutLinesList();
      });
    });
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

    window.addEventListener("keydown", (event) => {
      if (event.key === "Delete") {
        removeSelectedCutLine();
      }

      if (event.key === "Escape") {
        stopRotationHold();
      }
    });

    window.addEventListener("resize", reRenderWithResponsiveScale);

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    if (closeNetworkBannerBtn) {
      closeNetworkBannerBtn.addEventListener("click", hideNetworkBanner);
    }

    bindHoldRotation(rotateLeftBtn, -0.1);
    bindHoldRotation(rotateRightBtn, 0.1);
    bindHoldRotation(rotateLeftFastBtn, -1);
    bindHoldRotation(rotateRightFastBtn, 1);

    if (resetRotationBtn) {
      resetRotationBtn.addEventListener("click", resetRotation);
    }

    bindOutputSettingsEvents();
  }

  /* =========================
     INIT
  ========================= */
  function init() {
    renderEmptyCanvas();
    refreshUsageUI();
    updatePiecesCount();
    updateRotationUI();
    updateOutputUI();
    bindEvents();
    bindInstallPrompt();
    registerServiceWorker();
    handleOnlineStatus();
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
