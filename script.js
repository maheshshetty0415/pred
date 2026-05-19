document.addEventListener('DOMContentLoaded', () => {
    const signupTab = document.getElementById('signup-tab');
    const signinTab = document.getElementById('signin-tab');
    const nameField = document.getElementById('name-field');
    const submitBtn = document.getElementById('submit-btn');
    const toggleLink = document.getElementById('toggle-link');
    const authForm = document.getElementById('auth-form');

    let isSignUp = true;

    function toggleAuth(targetState) {
        isSignUp = targetState;

        if (isSignUp) {
            signupTab.classList.add('active');
            signinTab.classList.remove('active');
            nameField.style.display = 'block';
            submitBtn.innerText = 'Sign Up';
            toggleLink.innerText = 'I have an Account?';
        } else {
            signinTab.classList.add('active');
            signupTab.classList.remove('active');
            nameField.style.display = 'none';
            submitBtn.innerText = 'Sign In';
            toggleLink.innerText = 'Create an Account?';
        }
    }

    // Tab Clicks
    signupTab.addEventListener('click', () => toggleAuth(true));
    signinTab.addEventListener('click', () => toggleAuth(false));
    toggleLink.addEventListener('click', () => toggleAuth(!isSignUp));

    // Form Submission (Secure API Connection with Dynamic API_BASE)
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const fullname = document.getElementById('fullname') ? document.getElementById('fullname').value.trim() : '';

        const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (window.location.port === '5000' ? '' : 'http://localhost:5000') : '';

        if (isSignUp) {
            // --- SIGN UP LOGIC ---
            try {
                const res = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullname, email, password })
                });
                const data = await res.json();
                
                if (data.success) {
                    alert(`Sign Up Successful, Welcome ${fullname}! Your account has been securely created. Please Sign In.`);
                    authForm.reset();
                    toggleAuth(false);
                } else {
                    alert(data.message || "Registration failed. Please try again.");
                }
            } catch (err) {
                alert("Error connecting to security server. Please try again later.");
            }
        } else {
            // --- SIGN IN LOGIC ---
            try {
                const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                
                if (data.success) {
                    // Save user details to sessionStorage
                    sessionStorage.setItem('currentUser', JSON.stringify({
                        fullname: data.fullname,
                        email: data.email,
                        role: data.role
                    }));
                    sessionStorage.setItem('token', data.token);
                    window.location.href = 'hero.html';
                } else {
                    alert(data.message || "Login failed. Please check credentials.");
                }
            } catch (err) {
                alert("Error connecting to security server. Please try again later.");
            }
        }
    });

    // --- 3D Live Box Animation & Interactive Glow ---
    const rightPanel = document.querySelector('.auth-right');
    const formCard = document.querySelector('.form-container');

    if (rightPanel && formCard) {
        // Default position variables for smooth transition handling
        formCard.style.setProperty('--mouse-x', `50%`);
        formCard.style.setProperty('--mouse-y', `50%`);

        rightPanel.addEventListener('mousemove', (e) => {
            // Get bounding box of the right panel
            const bounds = rightPanel.getBoundingClientRect();
            
            // Calculate center of the panel
            const centerX = bounds.left + bounds.width / 2;
            const centerY = bounds.top + bounds.height / 2;

            // Calculate rotation values. Dividing by 40 limits the rotation intensity (subtle & smooth).
            let xAxis = -(centerX - e.clientX) / 40; 
            let yAxis = (centerY - e.clientY) / 40;

            // Calculate dynamic shadow offset (shadow pushes away from the mouse light source)
            let shadowX = (centerX - e.clientX) / 12;
            let shadowY = (centerY - e.clientY) / 12;

            // Calculate exact mouse position relative to the form card for the spotlight gradient
            const cardBounds = formCard.getBoundingClientRect();
            let mouseX = e.clientX - cardBounds.left;
            let mouseY = e.clientY - cardBounds.top;

            // Apply interactive spotlight and 3D tilting
            formCard.style.setProperty('--mouse-x', `${mouseX}px`);
            formCard.style.setProperty('--mouse-y', `${mouseY}px`);
            formCard.style.transform = `perspective(1500px) rotateY(${xAxis}deg) rotateX(${yAxis}deg) translateZ(15px)`;
            formCard.style.boxShadow = `${shadowX}px ${shadowY}px 50px rgba(56, 189, 248, 0.25), 0 30px 60px -15px rgba(0, 0, 0, 0.5)`;
        });

        // Remove the smooth transition when hovering so it tracks the mouse instantly
        rightPanel.addEventListener('mouseenter', () => {
            formCard.style.transition = 'none';
        });

        // Smoothly snap back to center and disable glow when mouse leaves the right panel
        rightPanel.addEventListener('mouseleave', () => {
            formCard.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease';
            formCard.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0)`;
            formCard.style.boxShadow = '0 30px 60px -15px rgba(0, 0, 0, 0.5), 0 0 30px rgba(56, 189, 248, 0.15)';
            formCard.style.setProperty('--mouse-x', `50%`);
            formCard.style.setProperty('--mouse-y', `50%`);
        });
    }
});
