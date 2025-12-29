let timeLeft = 180; // 3minutes
let initialTime = timeLeft;
let frozen = false;
let won = false;
let inCabin = false;
let regenIntervalId = null;
let timerIntervalId = null;

function updateTimerGlobal() {
    // Stop if timer not running
    if (timerIntervalId === null) return;
    if (won || frozen) return;

    const timerDisplay = document.getElementById("timer");
    const healthBarFill = document.getElementById('health-bar-fill');

    timeLeft--;
    if (timerDisplay) timerDisplay.textContent = timeLeft;

    if (healthBarFill) {
        const percentage = (timeLeft / initialTime) * 100;
        healthBarFill.style.width = `${percentage}%`;
        if (percentage > 66) {
            healthBarFill.style.backgroundColor = '#4CAF50';
        } else if (percentage > 33) {
            healthBarFill.style.backgroundColor = '#FFC107';
        } else {
            healthBarFill.style.backgroundColor = '#F44336';
        }
    }

    if (timeLeft <= 0) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        frozen = true;
        // Call respawn if available; else it will be handled when startGame runs
        setTimeout(() => {
            if (window.respawnPlayer) {
                window.respawnPlayer();
            }
        }, 2000);
    }
}

function startTimerGlobal() {
    if (timerIntervalId === null) {
        timerIntervalId = setInterval(updateTimerGlobal, 1000);
        console.log('Global timer started');
    }
}

// logic (startGame) will run only after the player clicks START.
document.addEventListener('DOMContentLoaded', function () {
    const scene = document.querySelector('a-scene');
    const startButton = document.getElementById('start-button');

    if (!startButton) {
        console.error('Start button not found.');
        return;
    }

    startButton.addEventListener('click', () => {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';

        // If the scene is already loaded, start immediately.
        // Start the global timer immediately on button press
        startTimerGlobal();

        if (scene && scene.hasLoaded) {
            startGame();
        } else if (scene) {
            // Otherwise wait for the scene to finish loading, then start.
            scene.addEventListener('loaded', startGame);
        } else {
            console.error('A-Frame scene element not found!');
        }
    });
});

// SNOW SYSTEM
window.addEventListener("load", () => {
    const snowContainer = document.querySelector("#snow");
    const player = document.querySelector("#player");

    if (!snowContainer || !player) return;

    const SNOW_COUNT = 500;
    const FALL_HEIGHT = 15;
    const SNOW_RADIUS = 40; // snow area around player
    const WIND_STRENGTH = 10;

    const flakes = [];

    function createFlake() {
        const flake = document.createElement("a-sphere");

        flake.setAttribute("radius", "0.035");
        flake.setAttribute("color", "#ffffff");

        snowContainer.appendChild(flake);
        flakes.push(flake);

        resetFlake(flake);
    }

    function resetFlake(flake) {
        const playerPos = player.object3D.position;

        const x = playerPos.x + (Math.random() * SNOW_RADIUS * 2 - SNOW_RADIUS);
        const y = playerPos.y + Math.random() * FALL_HEIGHT + 5;
        const z = playerPos.z + (Math.random() * SNOW_RADIUS * 2 - SNOW_RADIUS);

        const wind = Math.random() * WIND_STRENGTH - WIND_STRENGTH / 2;
        const duration = Math.random() * 4000 + 5000;

        flake.setAttribute("position", `${x} ${y} ${z}`);

        flake.setAttribute("animation__fall", {
        property: "position",
        to: `${x + wind} ${playerPos.y - 2} ${z}`,
        dur: duration,
        easing: "linear"
    });
  }

  for (let i = 0; i < SNOW_COUNT; i++) {
    createFlake();
  }

  // Recycle flakes when they finish falling
  flakes.forEach(flake => {
    flake.addEventListener("animationcomplete__fall", () => {
      resetFlake(flake);
    });
  });
});

// Main game logic
function startGame() {
    console.log("A-Frame scene loaded. Starting game logic.");
    // Play ambient and event sounds when the game starts
    try {
        const windEl = document.getElementById('wind-sound');
        const crashEl = document.getElementById('crash-sound');
        const campfireEl = document.getElementById('campfire-sound');

        if (crashEl && crashEl.components && crashEl.components.sound) {
            // play crash once to signal start
            crashEl.components.sound.playSound();
        }
        // start ambient sounds
        if (windEl && windEl.components && windEl.components.sound) {
            windEl.components.sound.playSound();
        }
        if (campfireEl && campfireEl.components && campfireEl.components.sound) {
            campfireEl.components.sound.playSound();
        }
    } catch (e) {
        console.warn('Could not play one or more sounds on start:', e);
    }
    const player = document.getElementById("player");
    const campfire = document.getElementById("campfire");

    // Ensure the player and campfire entities are found before proceeding
    if (!player || !campfire) {
        console.error("Player or Campfire entity not found in the scene!");
        return; // Stop execution if entities are missing
    }

    const timerDisplay = document.getElementById("timer");
    const statusDisplay = document.getElementById("status");
    // Get reference to the health bar fill element
    const healthBarFill = document.getElementById('health-bar-fill');

    // Use the global timeLeft/initialTime/frozen/etc so the Start button controls timer
    // If initialTime hasn't been set to a desired start value, set it here based on timeLeft
    initialTime = timeLeft;

    // SNOWDRIFT LOGIC 
    const snowdriftElements = [
        document.getElementById("snowdrift_1"),
        document.getElementById("snowdrift_2"),
        document.getElementById("snowdrift_3"),
        document.getElementById("snowdrift_4")
    ];

    // Define the normal and slow acceleration values
    const NORMAL_ACCELERATION = 18; 
    const SLOW_ACCELERATION = 5; // if player steps on snowdrift 

    // Function to check if player is in a snowdrift
    function checkSnowdrifts() {
        const playerPos = player.object3D.position;

        // Reset to normal acceleration first
        player.setAttribute('wasd-controls', 'acceleration', NORMAL_ACCELERATION);

        for (let i = 0; i < snowdriftElements.length; i++) {
            const driftEntity = snowdriftElements[i];
            if (!driftEntity) continue; // Skip if entity not found

            const driftPos = driftEntity.object3D.position;
            const driftGeometry = driftEntity.components.geometry.data;
            const halfWidth = driftGeometry.width / 2;
            const halfHeight = driftGeometry.height / 2;
            const halfDepth = driftGeometry.depth / 2;

            // Check if player is within the bounds of the snowdrift box
            if (
                playerPos.x >= driftPos.x - halfWidth &&
                playerPos.x <= driftPos.x + halfWidth &&
                playerPos.y >= driftPos.y - halfHeight &&
                playerPos.y <= driftPos.y + halfHeight &&
                playerPos.z >= driftPos.z - halfDepth &&
                playerPos.z <= driftPos.z + halfDepth
            ) {
                // Player is inside this snowdrift, set slow acceleration
                player.setAttribute('wasd-controls', 'acceleration', SLOW_ACCELERATION);
                console.log(`Player is in snowdrift ${i+1}, moving slowly.`);
                break; // Exit loop once a snowdrift is found (player can only be in one at a time)
            }
        }

        requestAnimationFrame(checkSnowdrifts); // Continue the check loop
    }

    // Start the snowdrift check loop
    checkSnowdrifts();
    

    // Reset player to spawn point (and reset timer/bar/flags)
    function respawnPlayer() {
        // Ensure only respawning if the frozen flag is set
        if (!frozen) {
             console.warn("Respawn called but player was not frozen.");
             return; // Exit if not frozen
        }

        console.log("Respawning player...");
        player.object3D.position.set(0, 1.6, 0); // Reset player position
        timeLeft = initialTime; // Reset time to initial value
        frozen = false; // Reset the frozen flag
        won = false;
        inCabin = false; // player no longer considered inside cabin after respawn
        if (regenIntervalId !== null) {
            clearInterval(regenIntervalId);
            regenIntervalId = null;
        }

        // Reset health bar to full green
        healthBarFill.style.width = '100%';
        healthBarFill.style.backgroundColor = '#4CAF50';

        // Clear the current interval if it exists (shouldn't be running, but safe)
        if (timerIntervalId !== null) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
        }

        // Start the global timer again for the new life
        startTimerGlobal();

    }
    // Expose respawn to global so the global timer can call it if needed
    window.respawnPlayer = respawnPlayer;

    // Cabin proximity check
    function checkCabinProximity() {
    const p = player.object3D.position; // Player's position
    const cabinEntity = document.getElementById('cabin');
    const statusDisplay = document.getElementById("status"); // status message element
    if (!cabinEntity) {
        console.error("Cabin entity not found!");
        requestAnimationFrame(checkCabinProximity);
        return;
    }
    const c = cabinEntity.object3D.position; // Cabin's position
    const distance = p.distanceTo(c);
    const inside = distance < 5; // proximity threshold

    // Player enters cabin area
    if (inside && !inCabin) {
        inCabin = true;
        won = true;

        // SHOW MESSAGE
        if (statusDisplay) {
            statusDisplay.style.display = "block";
            statusDisplay.textContent = "You reached the cabin!";
            setTimeout(() => {
                if (statusDisplay) statusDisplay.style.display = "none";
            }, 3000);
        }

        // Pause the timer while inside the cabin
        if (timerIntervalId !== null) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
        }

        // Start regenerating health/time while inside
        if (regenIntervalId === null) {
            regenIntervalId = setInterval(() => {
                if (timeLeft < initialTime) {
                    timeLeft = Math.min(timeLeft + 1, initialTime);
                    const timerDisplay = document.getElementById("timer");
                    if (timerDisplay) timerDisplay.textContent = timeLeft;
                    const healthBarFill = document.getElementById('health-bar-fill');
                    if (healthBarFill) {
                        const percentage = (timeLeft / initialTime) * 100;
                        healthBarFill.style.width = `${percentage}%`;
                        healthBarFill.style.backgroundColor = '#4CAF50';
                    }
                }
            }, 200);
        }

        // Start 30-second cabin exploration timer
        setTimeout(() => {
            const endScreen = document.getElementById("end-screen");
            if (endScreen) endScreen.style.display = "block";
        }, 30000); // 30 seconds
    }

    // Player leaves cabin area
    if (!inside && inCabin) {
        inCabin = false;
        won = false;

        // Stop regeneration
        if (regenIntervalId !== null) {
            clearInterval(regenIntervalId);
            regenIntervalId = null;
        }

        // Resume timer if not frozen
        if (!frozen) startTimerGlobal();
    }

    requestAnimationFrame(checkCabinProximity);
}

// Start cabin proximity loop
checkCabinProximity();


}