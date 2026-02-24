
/* ── CONFETTI ── */
function fireConfetti() {
    const count = 200;
    const defaults = {
        origin: { y: 0.7 }
    };

    function fire(particleRatio, opts) {
        // Fallback if no confetti library (we'll implement a simple one or just CSS)
        // Since we don't have a library, let's create a simple CSS-based confetti here
        createConfettiParticles(50);
    }

    fire(0.25, { spread: 26, startVelocity: 55, });
    fire(0.2, { spread: 60, });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45, });
}

function createConfettiParticles(amount) {
    const colors = ['#c0392b', '#e06070', '#b5883a', '#ffffff', '#2e7d32'];
    for (let i = 0; i < amount; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        conf.style.opacity = Math.random();
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 4000);
    }
}
