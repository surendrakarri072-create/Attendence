/**
 * Attendance Management System - User Module Logic
 * Updated for Modern UI (Tailwind + Stitch Design)
 */

let currentUser = null;
let currentIpInfo = null;
let currentLocation = null;
let todayRecords = { clockedIn: false, clockedOut: false, clockInTime: null, clockOutTime: null };

// Security: Escape HTML to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// UI Elements
const userLoginForm = document.getElementById('userLoginForm');
const welcomeElement = document.getElementById('welcomeUser');
const historyTableBody = document.getElementById('historyTableBody');
const attendanceOptions = document.getElementById('attendanceOptions');
const clockInBtn = document.getElementById('clockInBtn');
const clockOutBtn = document.getElementById('clockOutBtn');

// Status Elements
const ipMsg = document.getElementById('ipMsg');
const currentIpDisplay = document.getElementById('currentIpDisplay');
const locationMsg = document.getElementById('locationMsg');
const verifyLocationBtn = document.getElementById('verifyLocationBtn');

document.addEventListener('DOMContentLoaded', () => {
    if (userLoginForm) {
        initLogin();
    } else if (document.getElementById('welcomeUser')) {
        initDashboard();
    }
});

function initPasswordToggle() {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (!toggleBtn || !passwordInput) return;

    toggleBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = toggleBtn.querySelector('.material-icons');
        if (icon) {
            icon.textContent = type === 'password' ? 'visibility' : 'visibility_off';
            // BUG #8: Visual feedback for toggle
            toggleBtn.style.transform = 'scale(1.1)';
            setTimeout(() => toggleBtn.style.transform = 'scale(1)', 150);
        }
    });
}

function initLogin() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    initPasswordToggle();

    const ipDisplay = document.getElementById('ipDisplay');
    const networkStatusBadge = document.getElementById('networkStatusBadge');
    const ipAlertBanner = document.getElementById('ipAlertBanner');
    const ipAlertText = document.getElementById('ipAlertText');

    // Pre-check IP for login page
    async function preCheckIP() {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            if (ipDisplay) ipDisplay.textContent = data.ip;

            // This is just cosmetic for the login page until they try to login
            if (networkStatusBadge) {
                networkStatusBadge.textContent = 'Active';
                networkStatusBadge.className = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20';
            }
        } catch (e) {
            if (ipDisplay) ipDisplay.textContent = 'Unable to fetch';
        }
    }
    preCheckIP();

    userLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Clear previous error states
        const errorContainer = document.getElementById('loginErrorContainer');
        const errorMessage = document.getElementById('loginErrorMessage');
        if (errorContainer) errorContainer.classList.add('hidden');
        if (ipAlertBanner) ipAlertBanner.classList.add('hidden');

        const rollNumber = document.getElementById('rollNumber').value;
        const password = document.getElementById('password').value;

        const submitBtn = document.getElementById('loginBtn');
        const originalBtnContent = submitBtn.innerHTML;

        try {
            submitBtn.disabled = true;

            // 1. Geolocation Check
            submitBtn.innerHTML = '<span class="material-icons animate-spin text-sm">location_on</span><span>Locating...</span>';
            const locResult = await Geolocation.verifyLocation();

            if (!locResult.success) {
                throw new Error(`Location Access Failed: ${locResult.error}`);
            }

            if (!locResult.allowed) {
                throw new Error(`🚫 OUTSIDE OFFICE PREMISES (${Math.round(locResult.distance)}m)`);
            }

            // 2. Login & Server IP Check
            submitBtn.innerHTML = '<span class="material-icons animate-spin text-sm">login</span><span>Authenticating...</span>';
            const result = await API.userLogin(rollNumber, password);

            if (result.success) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(result.user));
                window.location.href = 'user-dashboard.html';
            } else {
                if (result.error === 'UNAUTHORIZED_IP' || result.error === 'NO_IP_REGISTERED') {
                    if (ipAlertBanner) {
                        ipAlertBanner.classList.remove('hidden');
                        ipAlertText.textContent = `Access Denied. Current IP: ${result.currentIp || 'Unknown'} is not authorized.`;
                    }
                    if (networkStatusBadge) {
                        networkStatusBadge.textContent = 'Unauthorized';
                        networkStatusBadge.className = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-500 border border-red-500/20';
                    }
                } else {
                    // Show centered error
                    if (errorContainer && errorMessage) {
                        errorContainer.classList.remove('hidden');
                        errorMessage.textContent = result.message || 'Login failed';
                    } else {
                        showToast(result.message, 'error');
                    }
                }
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }

        } catch (error) {
            console.error(error);
            // Show centered error
            if (errorContainer && errorMessage) {
                errorContainer.classList.remove('hidden');
                errorMessage.textContent = error.message;
            } else {
                showToast(error.message, 'error');
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnContent;
        }
    });

    // Roll number hint logic
    const rollInput = document.getElementById('rollNumber');
    if (rollInput) {
        rollInput.addEventListener('input', (e) => {
            const roll = e.target.value;
            const helpText = document.getElementById('passwordHelp');
            if (helpText && roll.length >= 3) {
                helpText.textContent = `Hint: Password logic is ${CONFIG.PASSWORD_PREFIX}${roll.slice(-3)}`;
            }
        });
    }
}

function initDashboard() {
    const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (!userStr) {
        window.location.href = 'user-login.html';
        return;
    }
    currentUser = JSON.parse(userStr);

    if (welcomeElement) {
        welcomeElement.textContent = `Welcome back, ${currentUser.name.split(' ')[0]}!`;
    }

    const rollDisplay = document.getElementById('rollNumberDisplay');
    if (rollDisplay) {
        rollDisplay.textContent = `Roll No: ${currentUser.rollNumber} • ${currentUser.department} Dept.`;
    }

    // Event Listeners
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        window.location.href = 'user-login.html';
    });

    if (clockInBtn) {
        clockInBtn.addEventListener('click', () => handleClockAction('Clock In'));
    }

    if (clockOutBtn) {
        clockOutBtn.addEventListener('click', () => handleClockAction('Clock Out'));
    }

    if (verifyLocationBtn) {
        verifyLocationBtn.addEventListener('click', verifyLocation);
    }

    // Load history and set states
    refreshDashboard().then(() => {
        updateUIWindows(); // Set dynamic window text
        checkIPStatus();
        setInterval(checkIPStatus, 30000); // 30 seconds
        setInterval(updateButtonStates, 1000); // Every second for the timer
    });

    // Phase 2 Initializers
    initTabNavigation();
    initIPRequests();
    loadNotifications();
}

/**
 * Update UI window text dynamically from CONFIG.TIME
 */
function updateUIWindows() {
    const clockInWindowText = document.getElementById('clockInWindowText');
    const clockOutWindowText = document.getElementById('clockOutWindowText');

    if (clockInWindowText) {
        const start = UTILS.formatTime(CONFIG.TIME.CLOCK_IN_START_HOUR, CONFIG.TIME.CLOCK_IN_START_MIN);
        const end = UTILS.formatTime(CONFIG.TIME.CLOCK_IN_END_HOUR, CONFIG.TIME.CLOCK_IN_END_MIN);
        clockInWindowText.textContent = `Window: ${start} — ${end}`;
    }

    if (clockOutWindowText) {
        const start = UTILS.formatTime(CONFIG.TIME.CLOCK_OUT_START);
        const end = UTILS.formatTime(CONFIG.TIME.CLOCK_OUT_END);
        clockOutWindowText.textContent = `Window: ${start} — ${end}`;
    }

    const clockOutStatusText = document.getElementById('clockOutStatusText');
    if (clockOutStatusText) {
        clockOutStatusText.textContent = `Must Clock In and complete minimum ${CONFIG.TIME.MIN_WORKING_HOURS} hours.`;
    }
}

/**
 * Consolidates all dashboard UI refreshes
 */
async function refreshDashboard() {
    await loadHistory();
    await loadAttendanceHeatmap();
    updateButtonStates();
}

// History Filter
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
            b.classList.remove('active', 'bg-primary', 'text-white');
            b.classList.add('text-slate-400', 'hover:text-white');
        });
        btn.classList.add('active', 'bg-primary', 'text-white');
        btn.classList.remove('text-slate-400', 'hover:text-white');
        const status = btn.getAttribute('data-status');
        loadHistory(status);
    });
});

window.switchSection = function (sectionId) {
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    const sections = {
        dashboard: document.getElementById('dashboardSection'),
        notifications: document.getElementById('notificationsSection'),
        security: document.getElementById('securitySection'),
        performance: document.getElementById('performanceSection')
    };

    if (!sections[sectionId]) return;

    // Update UI for all links (Sidebar & Mobile Nav)
    navLinks.forEach(l => {
        const isTarget = l.getAttribute('data-section') === sectionId;
        if (isTarget) {
            l.classList.add('bg-primary', 'text-white');
            l.classList.add('text-primary'); // For mobile nav icons
            l.classList.remove('text-slate-400', 'hover:bg-white/5', 'hover:text-white');
        } else {
            l.classList.remove('bg-primary', 'text-white', 'text-primary');
            l.classList.add('text-slate-400', 'hover:bg-white/5', 'hover:text-white');
        }
    });

    // Toggle sections visibility
    Object.keys(sections).forEach(key => {
        if (sections[key]) {
            sections[key].classList.add('hidden');
        }
    });
    sections[sectionId].classList.remove('hidden');

    // Load section specific data
    if (sectionId === 'notifications') loadNotifications();
    if (sectionId === 'security') loadSecurityData();
};

function initTabNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            switchSection(sectionId);
        });
    });

    // Header Icon Links
    const headerNotif = document.getElementById('headerNotificationBtn');
    const headerProfile = document.getElementById('headerProfileBtn');

    if (headerNotif) {
        headerNotif.addEventListener('click', () => switchSection('notifications'));
    }
    if (headerProfile) {
        headerProfile.addEventListener('click', () => switchSection('security'));
    }
}

/**
 * IP Registration Logic
 */
function initIPRequests() {
    const modal = document.getElementById('requestModal');
    const openBtn = document.getElementById('openRequestModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const form = document.getElementById('ipRequestForm');
    const ipInput = document.getElementById('reqIpAddress');

    if (openBtn) {
        openBtn.addEventListener('click', async () => {
            modal.classList.remove('hidden');
            // Auto-fill current IP
            if (!currentIpInfo) {
                // Try to get from last check or fetch new
                const result = await API.checkIPAuthorization(currentUser.rollNumber);
                currentIpInfo = { ip: result.currentIp };
            }
            ipInput.value = currentIpInfo.ip || 'Detecting...';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            submitBtn.disabled = true;
            submitBtn.textContent = 'SUBMITTING...';

            const requestData = {
                rollNumber: currentUser.rollNumber,
                ipAddress: ipInput.value,
                systemIdentifier: document.getElementById('reqSystemId').value,
                justification: document.getElementById('reqJustification').value,
                locationMetadata: {
                    city: 'Unknown (Client-side)',
                    isp: 'Detected at Server'
                }
            };

            const result = await API.submitIPRequest(requestData);

            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

            if (result.success) {
                showToast('Registration request submitted successfully!');
                modal.classList.add('hidden');
                form.reset();
                loadSecurityData();
            } else {
                showToast(result.message || 'Failed to submit request', 'error');
            }
        });
    }
}

async function loadNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;

    // BUG #15: Loading state indicator
    const originalContent = list.innerHTML;
    list.innerHTML = `
        <div class="glass-panel p-12 rounded-xl text-center">
            <span class="material-icons spinner text-4xl text-primary mb-4">sync</span>
            <p class="text-slate-400">Syncing notifications...</p>
        </div>
    `;

    const result = await API.getStudentNotifications(currentUser.rollNumber);

    if (result.success && result.notifications.length > 0) {
        list.innerHTML = result.notifications.map(n => {
            const isRead = n.readBy && n.readBy.some(r => r.user === currentUser._id || r.user?._id === currentUser._id);
            return `
            <div class="relative group bg-white dark:bg-slate-900 p-5 rounded-xl border-l-4 ${n.priority === 'Urgent' ? 'border-red-500' : 'border-primary'} shadow-sm hover:shadow-md transition-all ${isRead ? 'opacity-60' : ''}">
                <div class="flex gap-4">
                    <div class="h-10 w-10 flex-shrink-0 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                        <span class="material-icons-round text-xl">${n.priority === 'Urgent' ? 'priority_high' : 'notifications'}</span>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-slate-900 dark:text-slate-100">${escapeHTML(n.title)}</h3>
                                ${!isRead ? '<span class="h-2 w-2 bg-primary rounded-full animate-pulse"></span>' : ''}
                            </div>
                            <span class="text-[11px] text-slate-500 font-medium">${new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">${escapeHTML(n.message)}</p>
                        ${!isRead ? `
                            <button onclick="markAsRead('${n._id}')" class="mt-3 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                                <span class="material-icons text-xs">done_all</span>
                                Mark as Read
                            </button>
                        ` : '<span class="mt-3 text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1"><span class="material-icons text-xs">check</span> READ</span>'}
                    </div>
                </div>
            </div>
        `}).join('');
    }
    else {
        list.innerHTML = `
            <div class="glass-panel p-12 rounded-xl text-center">
                <span class="material-icons-round text-5xl text-slate-600 mb-4">notifications_off</span>
                <p class="text-slate-400">No notifications found</p>
            </div>
        `;
    }
}

window.markAsRead = async function (id) {
    const res = await API.markNotificationAsRead(id, currentUser._id);
    if (res.success) {
        loadNotifications();
    }
};

async function loadSecurityData() {
    const authList = document.getElementById('authorizedIpList');
    const historyTable = document.getElementById('requestHistoryTable');

    // BUG #15: Loading state indicators
    if (authList) authList.innerHTML = '<div class="py-10 text-center"><span class="material-icons spinner text-primary">sync</span></div>';
    if (historyTable) historyTable.innerHTML = '<tr><td colspan="4" class="py-10 text-center"><span class="material-icons spinner text-primary">sync</span></td></tr>';

    // 1. Load Authorized IPs
    const ipResult = await API.getStudentIPs(currentUser.rollNumber);
    if (ipResult.success) {
        authList.innerHTML = ipResult.ips.map(ip => `
            <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 group hover:border-primary/30 transition-all">
                <div class="flex items-center gap-4">
                    <div class="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                        <span class="material-icons-round">router</span>
                    </div>
                    <div>
                        <p class="font-mono font-bold text-slate-200">${escapeHTML(ip.ipAddress)}</p>
                        <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Authorized: ${new Date(ip.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${ip.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} uppercase">
                        ${ip.isActive ? 'Active' : 'Disabled'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    // 2. Load Request History
    const historyResult = await API.getMyIPRequests(currentUser.rollNumber);
    if (historyResult.success) {
        historyTable.innerHTML = historyResult.requests.map(r => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-slate-400">${new Date(r.createdAt).toLocaleDateString()}</td>
                <td class="px-6 py-4 font-mono font-bold text-slate-300">${r.ipAddress}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded text-[10px] font-bold ${r.status === 'Approved' ? 'bg-green-500/10 text-green-500' :
                r.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-red-500/10 text-red-500'
            } uppercase tracking-tight">
                        ${r.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-slate-400 italic font-medium">
                    ${r.adminComment || (r.status === 'Pending' ? 'Queued for review...' : 'N/A')}
                </td>
            </tr>
        `).join('');
    }
}

async function checkIPStatus() {
    if (!ipMsg) return;

    try {
        const result = await API.checkIPAuthorization(currentUser.rollNumber);
        const ipIcon = document.getElementById('ipIcon');

        if (currentIpDisplay) {
            currentIpDisplay.textContent = result.currentIp || 'Unknown';
        }

        if (result.success && result.ipAuthorized) {
            currentIpInfo = result;
            ipMsg.textContent = 'Authorized';
            ipMsg.className = 'text-lg font-bold text-primary';
            if (ipIcon) {
                ipIcon.className = 'h-12 w-12 rounded-lg bg-primary/20 text-primary flex items-center justify-center';
            }
            verifyLocation();
        } else if (result.success && !result.ipAuthorized) {
            currentIpInfo = null;
            ipMsg.textContent = 'Unauthorized';
            ipMsg.className = 'text-lg font-bold text-red-500';
            if (ipIcon) {
                ipIcon.className = 'h-12 w-12 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center';
            }
            disableButtons('Unauthorized Network');
        } else {
            // This handles result.success === false
            throw new Error(result.message || 'Verification Failed');
        }

    } catch (error) {
        console.error('IP check error:', error);
        if (ipMsg) {
            ipMsg.textContent = error.message.includes('Unknown server response') ? 'Server Error' : 'Connection Error';
            ipMsg.className = 'text-lg font-bold text-red-500';
            showToast(error.message || 'Unable to verify network authorization.', 'error');
        }
    }
}

async function verifyLocation() {
    const locationIcon = document.getElementById('locationIcon');
    if (!locationMsg) return;

    try {
        const result = await Geolocation.verifyLocation();

        if (result.success && result.allowed) {
            currentLocation = result.current;
            locationMsg.textContent = 'Within Range';
            locationMsg.className = 'text-lg font-bold text-green-500';
            if (locationIcon) {
                locationIcon.className = 'h-12 w-12 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center';
                locationIcon.querySelector('.material-icons-round').classList.add('animate-pulse');
            }
            if (verifyLocationBtn) verifyLocationBtn.classList.add('hidden');
            updateButtonStates();

        } else if (result.success && !result.allowed) {
            currentLocation = null;
            locationMsg.textContent = 'Outside Zone';
            locationMsg.className = 'text-lg font-bold text-red-500';
            if (locationIcon) {
                locationIcon.className = 'h-12 w-12 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center';
                locationIcon.querySelector('.material-icons-round').classList.remove('animate-pulse');
            }
            if (verifyLocationBtn) verifyLocationBtn.classList.remove('hidden');
            disableButtons('Outside Premises');

        } else {
            throw new Error(result.error || 'Unknown location error');
        }

    } catch (error) {
        console.error('Geolocation verification error:', error);
        if (locationMsg) {
            locationMsg.textContent = 'Location Error';
            locationMsg.className = 'text-lg font-bold text-red-500';
        }
        if (verifyLocationBtn) verifyLocationBtn.classList.remove('hidden');
        disableButtons('Location Service Unavailable');
        showToast(`Location Error: ${error.message || 'Please enable GPS/Location services.'}`, 'error');
    }
}

function disableButtons(reason) {
    if (clockInBtn) {
        clockInBtn.disabled = true;
        clockInBtn.className = 'w-full py-4 bg-slate-700 text-slate-400 font-bold rounded-xl cursor-not-allowed';
    }
    if (clockOutBtn) {
        clockOutBtn.disabled = true;
        clockOutBtn.className = 'w-full py-4 bg-slate-700 text-slate-400 font-bold rounded-xl cursor-not-allowed';
    }
}

function updateButtonStates() {
    if (!clockInBtn || !clockOutBtn) return;

    const clockInStatusBadge = document.getElementById('clockInStatusBadge');
    const clockOutStatusBadge = document.getElementById('clockOutStatusBadge');
    const clockInIcon = document.getElementById('clockInIcon');
    const clockOutIcon = document.getElementById('clockOutIcon');
    const clockOutLock = document.getElementById('clockOutLock');
    const waitTimer = document.getElementById('waitTimer');
    const clockOutTitle = document.getElementById('clockOutTitle');
    const clockOutStatusText = document.getElementById('clockOutStatusText');
    const lastClockInText = document.getElementById('lastClockInText');

    // State Checks
    const isIpValid = currentIpInfo && currentIpInfo.ipAuthorized;
    const isLocValid = locationMsg && locationMsg.classList.contains('text-green-500');
    const isTimeIn = UTILS.isTimeAllowed('Clock In');
    const isTimeOut = UTILS.isTimeAllowed('Clock Out');

    // 1. Clock In State
    if (todayRecords.clockedIn) {
        clockInBtn.disabled = true;
        if (todayRecords.clockedOut) {
            // Already clocked out for the day
            clockInBtn.className = 'w-full py-4 bg-slate-800 text-slate-500 font-bold rounded-xl cursor-default border border-white/5';
            clockInBtn.innerHTML = '<span class="material-icons-round">check_circle</span><span>CLOCKED</span>';
        } else {
            // Currently clocked in
            clockInBtn.className = 'w-full py-4 bg-slate-700 text-slate-400 font-bold rounded-xl cursor-default btn-working';
            clockInBtn.innerHTML = '<span class="material-icons-round animate-spin text-sm">sync</span><span>SESSION ACTIVE</span>';
        }

        if (clockInStatusBadge) {
            clockInStatusBadge.textContent = todayRecords.clockedOut ? 'COMPLETED' : 'ACTIVE';
            clockInStatusBadge.className = todayRecords.clockedOut
                ? 'bg-slate-500/20 text-slate-400 px-3 py-1 rounded-full text-xs font-bold uppercase'
                : 'bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-bold uppercase';
        }
        if (clockInIcon) {
            clockInIcon.className = todayRecords.clockedOut
                ? 'material-icons-round text-6xl text-slate-700 mb-4'
                : 'material-icons-round text-6xl text-primary mb-4';
        }
    } else {
        const canClockIn = isIpValid && isLocValid && isTimeIn;
        clockInBtn.disabled = !canClockIn;
        clockInBtn.className = canClockIn
            ? 'w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2'
            : 'w-full py-4 bg-slate-700 text-slate-400 font-bold rounded-xl cursor-not-allowed';
        clockInBtn.innerHTML = '<span class="material-icons-round">fingerprint</span>CONFIRM ATTENDANCE';
        if (clockInStatusBadge) {
            clockInStatusBadge.textContent = isTimeIn ? 'AVAILABLE' : 'LOCKED';
            clockInStatusBadge.className = isTimeIn
                ? 'bg-blue-500/20 text-blue-500 px-3 py-1 rounded-full text-xs font-bold uppercase'
                : 'bg-slate-500/20 text-slate-400 px-3 py-1 rounded-full text-xs font-bold uppercase';
        }
        if (clockInIcon) clockInIcon.className = 'material-icons-round text-6xl text-slate-600 mb-4';
    }

    // 2. Clock Out State & Timer
    let durationMet = true;
    let diffMs = 0;

    if (todayRecords.clockedIn) {
        const startTime = new Date(todayRecords.clockInTime);
        const endTime = todayRecords.clockedOut ? new Date(todayRecords.clockOutTime) : new Date();
        diffMs = endTime - startTime;
        const diffHrs = diffMs / (1000 * 60 * 60);

        if (!todayRecords.clockedOut && diffHrs < CONFIG.TIME.MIN_WORKING_HOURS) {
            durationMet = false;
            const remainingMs = (CONFIG.TIME.MIN_WORKING_HOURS * 3600000) - diffMs;
            const h = Math.floor(remainingMs / 3600000);
            const m = Math.floor((remainingMs % 3600000) / 60000);

            if (waitTimer) {
                waitTimer.classList.remove('hidden');
                document.getElementById('waitHours').textContent = h.toString().padStart(2, '0');
                document.getElementById('waitMins').textContent = m.toString().padStart(2, '0');
            }
            if (clockOutTitle) clockOutTitle.textContent = 'Checkout available in:';
        } else {
            if (waitTimer) waitTimer.classList.add('hidden');
            if (clockOutTitle) {
                clockOutTitle.textContent = todayRecords.clockedOut ? 'Have a Good Day!' : 'Checkout session active';
            }
        }
    }

    const canClockOut = isIpValid && isLocValid && isTimeOut && todayRecords.clockedIn && !todayRecords.clockedOut && durationMet;

    clockOutBtn.disabled = !canClockOut;
    clockOutBtn.className = canClockOut
        ? 'w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20'
        : 'w-full py-4 bg-slate-700 text-slate-400 font-bold rounded-xl cursor-not-allowed';

    if (todayRecords.clockedOut) {
        clockOutBtn.textContent = 'SESSION COMPLETED';
        clockOutBtn.className = 'w-full py-4 bg-slate-800 text-slate-500 font-bold rounded-xl cursor-default border border-white/5';
    } else {
        clockOutBtn.textContent = canClockOut ? 'CONFIRM CHECKOUT' : (isTimeOut ? 'WAITING FOR SESSION' : 'NOT AVAILABLE');
    }

    if (clockOutStatusBadge) {
        if (todayRecords.clockedOut) {
            clockOutStatusBadge.textContent = 'DONE';
            clockOutStatusBadge.className = 'bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-bold uppercase';
        } else {
            clockOutStatusBadge.textContent = isTimeOut ? 'ACTIVE' : 'LOCKED';
            clockOutStatusBadge.className = isTimeOut
                ? 'bg-blue-500/20 text-blue-500 px-3 py-1 rounded-full text-xs font-bold uppercase'
                : 'bg-slate-500/20 text-slate-400 px-3 py-1 rounded-full text-xs font-bold uppercase';
        }
    }

    if (clockOutIcon) {
        clockOutIcon.className = todayRecords.clockedOut ? 'material-icons-round text-6xl text-green-500' : (canClockOut ? 'material-icons-round text-6xl text-red-500' : 'material-icons-round text-6xl text-slate-600');
    }
    if (clockOutLock) {
        clockOutLock.className = canClockOut || todayRecords.clockedOut ? 'hidden' : 'material-icons-round absolute -bottom-1 -right-1 text-2xl text-amber-500';
    }

    // 3. Stats update
    const sessionTime = document.getElementById('sessionTime');
    if (sessionTime) {
        if (todayRecords.clockedIn) {
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            sessionTime.textContent = `${h}h ${m}m`;
        } else {
            // BUG #1: Better placeholder for inactive session
            sessionTime.textContent = 'Not Started';
            sessionTime.className = 'text-lg font-bold text-slate-500';
        }
    }

    // 4. Detailed Status Feedback
    if (lastClockInText) {
        if (todayRecords.clockedIn) {
            // Extract HH:MM AM/PM
            const d = new Date(todayRecords.clockInTime);
            const timeStr = UTILS.formatTime(d.getHours(), d.getMinutes());
            lastClockInText.textContent = `Session started at: ${timeStr}`;
            lastClockInText.className = 'mt-4 text-tiny text-primary uppercase font-bold';
        } else {
            lastClockInText.textContent = 'No active session today';
            lastClockInText.className = 'mt-4 text-tiny text-slate-500 uppercase font-medium';
        }
    }

    if (clockOutStatusText) {
        if (!todayRecords.clockedIn) {
            clockOutStatusText.textContent = 'Clock In required to start session.';
        } else if (todayRecords.clockedOut) {
            clockOutStatusText.textContent = 'Shift completed for today.';
        } else if (!durationMet) {
            clockOutStatusText.textContent = 'Complete minimum hours to checkout.';
        } else if (!isTimeOut) {
            clockOutStatusText.textContent = `Wait for window: ${UTILS.formatTime(CONFIG.TIME.CLOCK_OUT_START)} — ${UTILS.formatTime(CONFIG.TIME.CLOCK_OUT_END)}`;
        } else {
            clockOutStatusText.textContent = 'Ready for checkout. Verify location.';
        }
    }
}

async function handleClockAction(status) {
    if (!currentIpInfo || !currentIpInfo.ipAuthorized) {
        showToast('Unauthorized network detected.', 'error');
        return;
    }

    if (status === 'Clock Out') {
        if (!confirm('Are you sure you want to end your session?')) return;
    }

    const btn = status === 'Clock In' ? clockInBtn : clockOutBtn;
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons animate-spin text-sm">sync</span><span>Processing...</span>';

    try {
        const apiRes = await API.markAttendance({
            rollNumber: currentUser.rollNumber,
            status: status,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
        });

        if (apiRes.success) {
            showToast(`${status} successful!`, 'success');
            await refreshDashboard();
        } else {
            showToast(apiRes.message, 'error');
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }

    } catch (error) {
        console.error(error);
        showToast('Error: ' + error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

async function loadHistory(statusFilter = '') {
    if (!historyTableBody) return;

    // BUG #15: Loading state indicator
    historyTableBody.innerHTML = '<tr><td colspan="3" class="py-10 text-center"><span class="material-icons spinner text-primary">sync</span><p class="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Retrieving logs...</p></td></tr>';

    try {
        const allRecords = await API.getAttendance({ rollNumber: currentUser.rollNumber });
        const todayStr = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
        todayRecords = { clockedIn: false, clockedOut: false, clockInTime: null };

        const todayItems = allRecords
            .filter(r => r.date === todayStr)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (todayItems.length > 0) {
            const latest = todayItems[0];
            // Support 'Present' status for backward compatibility
            const isClockedIn = latest.status === 'Clock In' || latest.status === 'Present';
            const isClockedOut = latest.status === 'Clock Out';

            if (isClockedIn) {
                todayRecords.clockedIn = true;
                todayRecords.clockedOut = false;
                todayRecords.clockInTime = latest.timestamp;
            } else if (isClockedOut) {
                todayRecords.clockedIn = true;
                todayRecords.clockedOut = true;
                const clockIn = todayItems.find(r => r.status === 'Clock In' || r.status === 'Present');
                todayRecords.clockInTime = clockIn?.timestamp;
                todayRecords.clockOutTime = latest.timestamp;
            }
        }

        // Stats calculation
        const attendanceRateEl = document.getElementById('attendanceRate');
        const totalDaysPresentEl = document.getElementById('totalDaysPresent');
        const streakEl = document.querySelector('.text-amber-500'); // Streak element

        const sortedRecords = [...allRecords].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const uniqueDates = [...new Set(allRecords.map(r => r.date))].sort((a, b) => new Date(b) - new Date(a));
        const uniqueDaysCount = uniqueDates.length;

        // Calculate Streak
        let streak = 0;
        if (uniqueDaysCount > 0) {
            const today = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
            const yesDate = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
            yesDate.setDate(yesDate.getDate() - 1);
            const yesterday = yesDate.toISOString().split('T')[0];

            let checkDate = uniqueDates[0] === today ? today : (uniqueDates[0] === yesterday ? yesterday : null);

            if (checkDate) {
                streak = 1;
                let lastDate = new Date(checkDate);
                for (let i = 1; i < uniqueDates.length; i++) {
                    const nextDate = new Date(uniqueDates[i]);
                    const diffDays = Math.round((lastDate - nextDate) / 86400000);
                    if (diffDays === 1) {
                        streak++;
                        lastDate = nextDate;
                    } else {
                        break;
                    }
                }
            }
        }

        if (attendanceRateEl) {
            if (uniqueDaysCount === 0) {
                attendanceRateEl.textContent = 'New User';
            } else {
                const rate = Math.min(100, (uniqueDaysCount / 30) * 100).toFixed(1);
                attendanceRateEl.textContent = `${rate}%`;
            }
        }

        if (totalDaysPresentEl) {
            totalDaysPresentEl.textContent = uniqueDaysCount || '0';
        }

        if (streakEl) {
            streakEl.textContent = streak > 0 ? `${streak} Day${streak > 1 ? 's' : ''} 🔥` : '0 Days';
        }

        const punctualityEl = document.querySelector('.text-green-500'); // Punctuality placeholder
        if (punctualityEl) {
            const rate = (uniqueDaysCount / 30) * 100;
            punctualityEl.textContent = rate > 80 ? 'Excellent' : (rate > 50 ? 'Good' : 'Average');
        }

        let displayHistory = statusFilter ? allRecords.filter(r => r.status === statusFilter) : allRecords;

        if (displayHistory.length === 0) {
            // BUG #5: Improved empty state styling
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="px-8 py-16 text-center">
                        <div class="flex flex-col items-center gap-3 opacity-40">
                            <span class="material-icons text-4xl">history_toggle_off</span>
                            <p class="text-slate-400 font-medium italic">No attendance records found for this filter.</p>
                            <p class="text-[10px] uppercase tracking-wider">Clock in to see your session history</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        historyTableBody.innerHTML = displayHistory.map(record => {
            const statusClass = record.status === 'Clock In' ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary';
            return `
                <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="px-8 py-5 font-medium">${record.timestamp ? UTILS.formatDate(record.timestamp) : UTILS.formatDate(record.date)}</td>
                    <td class="px-8 py-5 font-mono text-sm text-slate-400">${record.ipUsed || 'Direct Access'}</td>
                    <td class="px-8 py-5">
                        <span class="${statusClass} px-3 py-1 rounded-full text-xs font-medium">${record.status || 'Present'}</span>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('History error:', error);
    }
}

async function loadAttendanceHeatmap() {
    const heatmapContainer = document.getElementById('attendanceHeatmap');
    if (!heatmapContainer) return;

    const allRecords = await API.getAttendance({ rollNumber: currentUser.rollNumber });

    // Last 30 days
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toDateString());
    }

    heatmapContainer.innerHTML = days.map(day => {
        const dStr = new Date(new Date(day).getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const activityCount = allRecords.filter(r => r.date === dStr).length;

        let colorClass = 'bg-white/5';
        if (activityCount === 1) colorClass = 'bg-primary/30';
        if (activityCount >= 2) colorClass = 'bg-primary';

        return `
            <div class="h-3 w-3 rounded-sm ${colorClass} hover:ring-1 hover:ring-white/20 transition-all cursor-help" 
                 title="${day}: ${activityCount > 0 ? activityCount + ' sessions' : 'No activity'}">
            </div>
        `;
    }).join('');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-8 right-8 px-6 py-3 rounded-xl shadow-2xl z-[1000] transform transition-all translate-y-20 flex items-center gap-3 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white font-bold`;

    toast.innerHTML = `
        <span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span>
        ${message}
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-20');
        toast.classList.add('translate-y-0');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('translate-y-0');
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

window.downloadHistoryExcel = async function () {
    if (!currentUser) return;

    showToast('Preparing Report...', 'info');

    try {
        const attendance = await API.getAttendance({ rollNumber: currentUser.rollNumber });

        if (attendance.length === 0) {
            showToast('No records found to export', 'error');
            return;
        }

        // Format data for Excel
        const excelData = attendance.map(r => ({
            'Student Name': currentUser.name,
            'Roll Number': currentUser.rollNumber,
            'Date': r.date,
            'Time': r.timestamp ? UTILS.formatDate(r.timestamp).split(', ')[1] : '-',
            'Status': r.status,
            'IP Address': r.ipUsed || 'Direct Access'
        }));

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "My Attendance");

        // Download the file
        XLSX.writeFile(wb, `My_Attendance_${currentUser.rollNumber}.xlsx`);
        showToast('Download started', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export data', 'error');
    }
};

