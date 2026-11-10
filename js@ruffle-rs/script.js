const fileInput = document.getElementById("fileInput");

    const playerContainer = document.getElementById("playerContainer");
    const playerElement = document.getElementById("player");

    const reloadButton = document.getElementById("reloadButton");
    const unloadButton = document.getElementById("unloadButton");
    const fullscreenButton = document.getElementById("fullscreenButton");

    const fileNameElement = document.getElementById("fileName");
    const statusElement = document.getElementById("status");

    const volumeSlider = document.getElementById("volumeSlider");

    let ruffleInstance = null;
    let currentFile = null;
    let currentURL = null;
    let loadGeneration = 0;
    let resizeObserver = null;

    function setStatus(message) {
        statusElement.textContent = " | " + message;
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }

    function updatePlayerSize() {
        if (!ruffleInstance) {
            return;
        }

        const rect = playerElement.getBoundingClientRect();

        ruffleInstance.style.width = Math.max(1, rect.width) + "px";
        ruffleInstance.style.height = Math.max(1, rect.height) + "px";
    }

    function initializeResizeObserver() {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }

        resizeObserver = new ResizeObserver(() => {
            updatePlayerSize();
        });

        resizeObserver.observe(playerContainer);
    }

    function initializeRuffle() {
        if (!window.RufflePlayer) {
            setStatus("Ruffle is not available");
            return false;
        }

        try {
            playerElement.innerHTML = "";

            const ruffle = window.RufflePlayer.newest();

            ruffleInstance = ruffle.createPlayer();

            ruffleInstance.style.display = "block";
            ruffleInstance.style.width = "100%";
            ruffleInstance.style.height = "100%";
            ruffleInstance.style.border = "0";
            ruffleInstance.style.outline = "0";
            ruffleInstance.style.backgroundColor = "#000000";

            playerElement.appendChild(ruffleInstance);

            ruffleInstance.ruffle().volume =
                Number(volumeSlider.value) / 100;

            initializeResizeObserver();
            updatePlayerSize();

            return true;

        } catch (error) {
            setStatus("Could not initialize Ruffle");
            console.error(error);

            return false;
        }
    }

    async function loadSWF(file) {
        if (!file) {
            return;
        }

        if (!file.name.toLowerCase().endsWith(".swf")) {
            setStatus("Please select a SWF file");
            return;
        }

        const generation = ++loadGeneration;

        currentFile = file;

        if (currentURL) {
            URL.revokeObjectURL(currentURL);
            currentURL = null;
        }

        currentURL = URL.createObjectURL(file);

        fileNameElement.textContent = file.name;

        reloadButton.disabled = false;
        unloadButton.disabled = false;

        setStatus("Loading " + file.name);

        if (!ruffleInstance && !initializeRuffle()) {
            return;
        }

        try {
            await ruffleInstance.ruffle().load({
                url: currentURL
            });

            if (generation !== loadGeneration) {
                return;
            }

            setStatus("Loaded " + file.name);

            ruffleInstance.ruffle().volume =
                Number(volumeSlider.value) / 100;

            updatePlayerSize();

            // No automatic fullscreen.

        } catch (error) {
            if (generation !== loadGeneration) {
                return;
            }

            console.error(error);

            setStatus("Failed to load SWF");

            playerElement.innerHTML = `
                <div class="placeholder">
                    Could not load this SWF file.
                    <br><br>
                    ${escapeHTML(error.message || "Unknown error")}
                </div>
            `;

            ruffleInstance = null;
        }
    }

    async function reloadSWF() {
        if (!currentFile) {
            return;
        }

        const generation = ++loadGeneration;

        if (!currentURL) {
            currentURL = URL.createObjectURL(currentFile);
        }

        setStatus("Reloading");

        if (!ruffleInstance && !initializeRuffle()) {
            return;
        }

        try {
            await ruffleInstance.ruffle().load({
                url: currentURL
            });

            if (generation !== loadGeneration) {
                return;
            }

            ruffleInstance.ruffle().volume =
                Number(volumeSlider.value) / 100;

            updatePlayerSize();

            setStatus("Reloaded");

            // No automatic fullscreen.

        } catch (error) {
            console.error(error);
            setStatus("Reload failed");
        }
    }

    function unloadSWF() {
        loadGeneration++;

        if (currentURL) {
            URL.revokeObjectURL(currentURL);
            currentURL = null;
        }

        currentFile = null;

        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        ruffleInstance = null;

        playerElement.innerHTML = `
            <div class="placeholder">
                Open a SWF file to begin.
            </div>
        `;

        fileNameElement.textContent = "No file loaded yet";

        reloadButton.disabled = true;
        unloadButton.disabled = true;

        fileInput.value = "";

        setStatus("Ready");
    }

    async function toggleFullscreen() {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await playerContainer.requestFullscreen();
            }
        } catch (error) {
            console.error("Fullscreen error:", error);
            setStatus("Fullscreen unavailable");
        }
    }

    fileInput.addEventListener("change", event => {
        const file = event.target.files[0];

        if (file) {
            loadSWF(file);
        }
    });

    reloadButton.addEventListener("click", reloadSWF);

    unloadButton.addEventListener("click", unloadSWF);

    fullscreenButton.addEventListener("click", toggleFullscreen);

    volumeSlider.addEventListener("input", () => {
        if (ruffleInstance) {
            ruffleInstance.ruffle().volume =
                Number(volumeSlider.value) / 100;
        }
    });

    playerContainer.addEventListener("dragover", event => {
        event.preventDefault();
    });

    playerContainer.addEventListener("drop", event => {
        event.preventDefault();

        const file = event.dataTransfer.files[0];

        if (file) {
            loadSWF(file);
        }
    });

    document.addEventListener("fullscreenchange", () => {
        updatePlayerSize();
    });

    document.addEventListener("keydown", event => {
        const target = event.target;

        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement
        ) {
            return;
        }

        if (event.ctrlKey && event.key.toLowerCase() === "o") {
            event.preventDefault();
            fileInput.click();
        }

        if (
            event.key.toLowerCase() === "f" &&
            !event.ctrlKey &&
            !event.altKey
        ) {
            event.preventDefault();
            toggleFullscreen();
        }
    });

    window.addEventListener("pagehide", () => {
        if (currentURL) {
            URL.revokeObjectURL(currentURL);
            currentURL = null;
        }
    });

    window.addEventListener("load", () => {
        if (initializeRuffle()) {
            setStatus("Ready");
        }
    });
