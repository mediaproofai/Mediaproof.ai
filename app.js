document.getElementById("analyzeBtn").addEventListener("click", async () => {
    const fileInput = document.getElementById("fileInput");
    if (!fileInput.files.length) return alert("Select a file first!");

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    const res = await fetch("https://mediaproof-backend.mediaproofai.workers.dev/", {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    document.getElementById("results").classList.remove("hidden");

    document.getElementById("aiScore").textContent = data.aiScore;
    document.getElementById("realFake").textContent = data.realFake;
    document.getElementById("lastPosted").textContent = data.lastPostedDate;
    document.getElementById("firstSeen").textContent = data.firstSeen;
    document.getElementById("postedBy").textContent = data.postedBy;
    document.getElementById("trustScore").textContent = data.trustworthiness;
    document.getElementById("tampering").textContent = data.tampering;
});
