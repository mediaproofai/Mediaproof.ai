// Mediaproof AI — upgraded frontend script
// - preserves all existing result fields (aiScore, realFake, lastPostedDate, firstSeen, postedBy, trustworthiness, tampering)
// - adds drag/drop, file preview text, upload progress and animated scan UI

(function () {
  const endpoint = "https://mediaproof-backend.mediaproofai.workers.dev/";

  const fileInput = document.getElementById("fileInput");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const dropzone = document.getElementById("dropzone");
  const fileMeta = document.getElementById("fileMeta");

  const progressWrap = document.getElementById("progressWrap");
  const progressBar = document.getElementById("progressBar");
  const progressPercent = document.getElementById("progressPercent");

  const results = document.getElementById("results");
  const inspectionDetails = document.getElementById("inspectionDetails");

  // result fields (preserve ids)
  const elAiScore = document.getElementById("aiScore");
  const elRealFake = document.getElementById("realFake");
  const elLastPosted = document.getElementById("lastPosted");
  const elFirstSeen = document.getElementById("firstSeen");
  const elPostedBy = document.getElementById("postedBy");
  const elTrustScore = document.getElementById("trustScore");
  const elTampering = document.getElementById("tampering");

  // Helpers
  function resetProgress() {
    progressBar.style.width = "0%";
    progressPercent.textContent = "0%";
    progressWrap.classList.add("hidden");
  }

  function showProgress() {
    progressWrap.classList.remove("hidden");
  }

  function formatFileMeta(file) {
    if (!file) return "";
    const kb = Math.round(file.size / 1024);
    return `${file.name} • ${kb} KB • ${file.type || "unknown"}`;
  }

  // Drag & drop UX
  ;["dragenter", "dragover"].forEach(ev => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.add("dragover");
    });
  });

  ;["dragleave", "drop", "dragend"].forEach(ev => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      fileInput.files = dt.files;
      fileMeta.textContent = formatFileMeta(dt.files[0]);
    }
  });

  // file select
  fileInput.addEventListener("change", () => {
    const f = fileInput.files[0];
    fileMeta.textContent = formatFileMeta(f);
  });

  // Animate a fake-but-smooth progress if browser doesn't provide good progress info
  function smoothIncrement(targetPct, cb) {
    // gently increment to targetPct
    let current = parseInt(progressBar.style.width) || 0;
    const step = () => {
      current = Math.min(targetPct, current + Math.max(1, Math.round((targetPct - current) * 0.12)));
      progressBar.style.width = current + "%";
      progressPercent.textContent = `${current}%`;
      if (current < targetPct) {
        requestAnimationFrame(step);
      } else if (cb) cb();
    };
    requestAnimationFrame(step);
  }

  function setFinalProgress() {
    progressBar.style.width = "100%";
    progressPercent.textContent = "100%";
  }

  // Main analyze flow using XMLHttpRequest for upload progress
  analyzeBtn.addEventListener("click", async () => {
    if (!fileInput.files.length) {
      return alert("Select a file first!");
    }

    // Reset UI
    results.classList.add("hidden");
    resetProgress();
    showProgress();
    elAiScore.textContent = "—";
    elRealFake.textContent = "—";
    elLastPosted.textContent = "—";
    elFirstSeen.textContent = "—";
    elPostedBy.textContent = "—";
    elTrustScore.textContent = "—";
    elTampering.textContent = "—";
    inspectionDetails.textContent = "Scanning media and contacting Mediaproof analysis engine...";

    const file = fileInput.files[0];
    const formData = new FormData();
formData.append("file", selectedFile);
formData.append("email", email);

const resp = await fetch(BACKEND, {
  method: "POST",
  body: formData
});


    // Create XHR for progress reporting
    const xhr = new XMLHttpRequest();

    xhr.open("POST", endpoint, true);
    xhr.responseType = "json";

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 60); // use upload for first 60%
        progressBar.style.width = pct + "%";
        progressPercent.textContent = pct + "%";
      }
    });

    // Some servers provide download progress when preparing results; use to update to 85%
    xhr.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        // map overall progress to 60-85%
        const pct = 60 + Math.round((e.loaded / e.total) * 25);
        progressBar.style.width = pct + "%";
        progressPercent.textContent = pct + "%";
      } else {
        // if not computable, slowly advance so user doesn't feel stuck
        smoothIncrement(70);
      }
    });

    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status >= 200 && xhr.status < 300) {
          // success: parse json (xhr.response may already be JSON)
          const data = xhr.response && typeof xhr.response === "object" ? xhr.response : parseJSONSafe(xhr.responseText);
          setFinalProgress();
          // slight delay for UX
          setTimeout(() => {
            showResults(data);
          }, 260);
        } else {
          // error
          setFinalProgress();
          progressPercent.textContent = "Error";
          inspectionDetails.textContent = `Analysis failed (status ${xhr.status}). Please try again later.`;
          console.error("Upload error", xhr.status, xhr.responseText);
        }
      }
    };

    // small UX delay so animation is visible
    setTimeout(() => {
      xhr.send(formData);
    }, 160);
  });

  function parseJSONSafe(text) {
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  // Render response while preserving fields
  function showResults(data) {
    if (!data) {
      inspectionDetails.textContent = "No data returned from the analysis engine.";
      results.classList.remove("hidden");
      return;
    }

    // The backend may use different keys; keep graceful fallbacks
    elAiScore.textContent = data.aiScore ?? data.score ?? "—";
    elRealFake.textContent = data.realFake ?? (typeof data.real === "boolean" ? (data.real ? "Real" : "Fake") : "—");
    elLastPosted.textContent = data.lastPostedDate ?? data.lastPosted ?? "—";
    elFirstSeen.textContent = data.firstSeen ?? data.first_seen ?? "—";
    elPostedBy.textContent = data.postedBy ?? data.posted_by ?? (data.source ?? "—");
    elTrustScore.textContent = data.trustworthiness ?? data.trustScore ?? "—";
    elTampering.textContent = data.tampering ?? data.tamper ?? "—";

    // If backend provides extra details, show them
    if (data.details) {
      inspectionDetails.textContent = data.details;
    } else if (data.analysisNotes) {
      inspectionDetails.textContent = data.analysisNotes;
    } else {
      inspectionDetails.textContent = "Detailed inspection results will appear here. Expand for provenance and model traces when available.";
    }

    // Reveal results with fade-in
    results.classList.remove("hidden");
    results.classList.add("fade-in");

    // cleanup progress UI after a moment
    setTimeout(() => {
      progressWrap.classList.add("hidden");
      progressBar.style.width = "0%";
      progressPercent.textContent = "0%";
    }, 800);
  }

  // initialize small UX state
  (function init() {
    resetProgress();
    // show current file meta if already selected (useful on page reload)
    if (fileInput.files && fileInput.files[0]) {
      fileMeta.textContent = formatFileMeta(fileInput.files[0]);
    }
    // Accessibility: allow Enter to open file dialog on dropzone
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput.click();
      }
    });
  })();

})();
