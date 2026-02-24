/**
 * Attendance Management System - Admin Module Logic
 * Updated for Modern UI
 */

// DOM Elements
const loginForm = document.getElementById('adminLoginForm');
const userTableBody = document.getElementById('userTableBody');
const attendanceTableBody = document.getElementById('attendanceTableBody');
const violationTableBody = document.getElementById('violationTableBody');
const auditLogsTableBody = document.getElementById('auditLogsTableBody');
const branchTableBody = document.getElementById('branchTableBody');
const addUserForm = document.getElementById('addUserForm');

// IP Modal Elements
const ipModal = document.getElementById('ipModal');
const ipModalTitle = document.getElementById('ipModalTitle');
const ipTableBody = document.getElementById('ipTableBody');

// State/Global Variables
let attendanceChart = null;
let liveMap = null;
let mapMarkers = [];

const totalUsersEl = document.getElementById('totalUsers');
const todayPresentEl = document.getElementById('todayPresent');
const totalViolationsEl = document.getElementById('totalViolations');
const noIPsMessage = document.getElementById('noIPsMessage');
const addIPForm = document.getElementById('addIPForm');
let currentManagingUser = null;

let currentStatusFilter = '';

document.addEventListener('DOMContentLoaded', () => {
    if (loginForm) {
        initLogin();
    } else if (document.body.classList.contains('font-display') && document.querySelector('aside')) {
        initDashboard();
    }
});

function initPasswordToggle() {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (!toggleBtn || !passwordInput) return;

    toggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        toggleBtn.querySelector('.material-icons').textContent = isPassword ? 'visibility_off' : 'visibility';
    });
}

function initLogin() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    initPasswordToggle();

    // Bug Fix #1: Toggle login button based on "Remember session" checkbox
    const rememberCheckbox = document.getElementById('rememberSession');
    const loginBtn = document.getElementById('adminLoginBtn');
    if (rememberCheckbox && loginBtn) {
        rememberCheckbox.addEventListener('change', () => {
            if (rememberCheckbox.checked) {
                loginBtn.disabled = false;
                loginBtn.classList.remove('bg-slate-700', 'text-slate-500', 'cursor-not-allowed', 'opacity-60');
                loginBtn.classList.add('bg-primary', 'hover:bg-primary/90', 'text-white', 'shadow-lg', 'shadow-primary/20');
                loginBtn.title = '';
            } else {
                loginBtn.disabled = true;
                loginBtn.classList.add('bg-slate-700', 'text-slate-500', 'cursor-not-allowed', 'opacity-60');
                loginBtn.classList.remove('bg-primary', 'hover:bg-primary/90', 'text-white', 'shadow-lg', 'shadow-primary/20');
                loginBtn.title = "Check 'Remember session' to enable login";
            }
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Clear previous error states
        const errorContainer = document.getElementById('loginErrorContainer');
        const errorMessage = document.getElementById('loginErrorMessage');
        if (errorContainer) errorContainer.classList.add('hidden');

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-icons animate-spin text-sm">sync</span> AUTHORIZING...';

        const result = await API.adminLogin(username, password);

        if (result.success) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, result.token);
            window.location.href = 'admin-dashboard.html';
        } else {
            console.warn('Admin Login Failed:', result);

            // Show centered error with specific message
            if (errorContainer && errorMessage) {
                errorContainer.classList.remove('hidden');
                // Use the message from the API result, or fall back to a specific diagnostic message
                errorMessage.textContent = result.message || 'Authorization failed (Service connection error)';

                // Add icon to indicate failure type if possible (optional but helpful)
                const errorIcon = errorContainer.querySelector('.material-icons');
                if (errorIcon && result.status === 0) {
                    errorIcon.textContent = 'wifi_off'; // Connection issue
                } else if (errorIcon) {
                    errorIcon.textContent = 'error_outline';
                }
            } else {
                showToast(result.message || 'Authorization failed', 'error');
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Security: Escape HTML to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function initDashboard() {
    // Basic Session Check
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN)) {
        window.location.href = 'admin-login.html';
        return;
    }

    // Load Initial Data
    loadDashboardData();

    // Event Listeners
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        window.location.href = 'admin-login.html';
    });

    // Tab Switching - Updated for Modern UI
    const tabs = document.querySelectorAll('.nav-link');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();

            // UI Update for Tabs
            tabs.forEach(t => {
                t.classList.remove('bg-primary', 'text-white', 'active');
                t.classList.add('text-slate-400', 'hover:bg-white/5', 'hover:text-white');
            });
            tab.classList.remove('text-slate-400', 'hover:bg-white/5', 'hover:text-white');
            tab.classList.add('bg-primary', 'text-white', 'active');

            // Content Update
            contents.forEach(c => c.classList.remove('active-tab'));
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active-tab');
            }

            // Phase 2: Load relevant data
            if (targetId === 'ip-requests-section') loadIPRequests();
            if (targetId === 'notifications-section') loadBroadcastHistory();
            if (targetId === 'audit-logs-section') loadAuditLogs();
            if (targetId === 'attendance-section') loadAttendance();
            if (targetId === 'violations-section') loadViolations();
            if (targetId === 'geofencing-section') loadBranches();
            if (targetId === 'live-monitor-section') initLiveMap();
        });
    });

    // Phase 2: Initial Broadcast Handler
    const broadcastForm = document.getElementById('broadcastForm');
    if (broadcastForm) {
        broadcastForm.addEventListener('submit', handleBroadcastSubmission);
    }

    // Phase 2: Branch/Geofence Handler
    const addBranchForm = document.getElementById('addBranchForm');
    if (addBranchForm) {
        addBranchForm.addEventListener('submit', handleBranchSubmission);
    }

    // Add User
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('newUserName').value;
            const roll = document.getElementById('newUserRoll').value;
            const dept = document.getElementById('newUserDept').value || 'General';

            if (roll.length < 3) {
                showToast('Roll Number too short', 'error');
                return;
            }
            const password = CONFIG.PASSWORD_PREFIX + roll.slice(-3);

            const result = await API.addUser({
                name: name,
                rollNumber: roll,
                department: dept,
                password: password
            });

            if (result.success) {
                showToast(`User added! Pass: ${password}`, 'success');
                addUserForm.reset();
                loadDashboardData();
            } else {
                showToast(result.message, 'error');
            }
        });
    }

    // Add IP Form
    if (addIPForm) {
        addIPForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentManagingUser) return;

            const ipInput = document.getElementById('newIPAddress');
            const ipAddress = ipInput.value.trim();
            const submitBtn = addIPForm.querySelector('button');
            const originalText = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Adding...';

            const result = await API.addIP(currentManagingUser, ipAddress);

            if (result.success) {
                showToast('IP Authorized', 'success');
                ipInput.value = '';
                loadIPsForUser(currentManagingUser);
                loadUsers();
            } else {
                showToast(result.error, 'error');
            }

            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
    }

    // Filters
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('active', 'bg-primary', 'text-white');
                b.classList.add('text-slate-400');
            });
            btn.classList.add('active', 'bg-primary', 'text-white');
            btn.classList.remove('text-slate-400');
            currentStatusFilter = btn.getAttribute('data-status');
            loadAttendance();
        });
    });

    document.getElementById('applyFilters')?.addEventListener('click', loadAttendance);
}

async function loadDashboardData() {
    await Promise.all([loadUsers(), loadAttendance(), loadViolations()]);
    updateStats();
}

async function updateStats() {
    const users = await API.getUsers();
    const statsResult = await API.getAttendanceStats();
    const violations = await API.getViolations();

    const presentToday = statsResult.success ? statsResult.stats.todayPresent : 0;

    if (totalUsersEl) totalUsersEl.textContent = users.length;
    if (todayPresentEl) todayPresentEl.textContent = presentToday;
    if (totalViolationsEl) totalViolationsEl.textContent = violations.length;

    const attendance = await API.getAttendance();
    initAttendanceChart(attendance);
}

function initAttendanceChart(attendanceData) {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;

    if (attendanceChart) attendanceChart.destroy();

    // Group by last 7 days
    const days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return new Date(d.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
    }).reverse();

    const counts = days.map(day => {
        const dayRecords = attendanceData.filter(a => a.date === day);
        return new Set(dayRecords.map(a => a.rollNumber)).size;
    });

    attendanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days.map(d => { const dt = new Date(d + 'T00:00:00'); return dt.toLocaleDateString('en-IN', { weekday: 'short' }); }),
            datasets: [{
                label: 'Present Students',
                data: counts,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                x: { grid: { display: false }, border: { display: false } }
            }
        }
    });
}

async function loadUsers() {
    if (!userTableBody) return;
    // BUG #15: Loading state indicator
    userTableBody.innerHTML = '<tr><td colspan="6" class="py-10 text-center"><span class="material-icons spinner text-primary">sync</span><p class="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Loading user database...</p></td></tr>';
    const users = await API.getUsers();

    userTableBody.innerHTML = users.map(user => {
        let ipStatus;
        if (user.ipStatus) {
            // BUG #11: Status badge with icon for accessibility
            ipStatus = '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-green-500/10 text-green-500 font-bold border border-green-500/20 uppercase"><span class="material-icons text-[10px]">check_circle</span> AUTHORIZED</span>';
        } else {
            ipStatus = '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-red-500/10 text-red-500 font-bold border border-red-500/20 uppercase"><span class="material-icons text-[10px]">error_outline</span> MISSING IP</span>';
        }

        return `
        <tr class="hover:bg-white/5 transition-colors group">
            <td class="px-6 py-4 text-sm font-mono text-primary font-bold">${escapeHTML(user.rollNumber)}</td>
            <td class="px-6 py-4 text-sm text-slate-100">${escapeHTML(user.name)}</td>
            <td class="px-6 py-4 text-sm text-slate-400">${escapeHTML(user.department)}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 bg-white/5 rounded text-xs font-mono text-slate-500 border border-white/5">••••••••</span></td>
            <td class="px-6 py-4">${ipStatus}</td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button class="p-2 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-lg transition-all" onclick="openIPModal('${user.rollNumber}', '${user.name}')">
                        <span class="material-icons text-sm">settings_ethernet</span>
                    </button>
                    <button class="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-all" onclick="removeUser('${user.rollNumber}')">
                        <span class="material-icons text-sm">delete_outline</span>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

window.removeUser = async function (rollNumber) {
    if (confirm('Permanently remove this user and all associated security data?')) {
        const res = await API.removeUser(rollNumber);
        if (res.success) {
            showToast('User Exited', 'success');
            loadDashboardData();
        } else {
            showToast(res.message, 'error');
        }
    }
};

window.openIPModal = function (rollNumber, name) {
    currentManagingUser = rollNumber;
    // BUG #7: Standardized and professional modal title
    ipModalTitle.innerHTML = `<span class="text-primary font-bold">Security Management:</span> <span class="text-white">${escapeHTML(name)}</span> <span class="text-slate-500 text-sm">(${escapeHTML(rollNumber)})</span>`;
    ipModal.classList.remove('hidden');
    ipModal.classList.add('flex');
    loadIPsForUser(rollNumber);
};

window.closeIPModal = function () {
    ipModal.classList.add('hidden');
    ipModal.classList.remove('flex');
    currentManagingUser = null;
    noIPsMessage.classList.add('hidden');
    ipTableBody.innerHTML = '';
};

window.onclick = function (event) {
    if (event.target === ipModal) {
        closeIPModal();
    }
};

async function loadIPsForUser(rollNumber) {
    ipTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-slate-500">Retrieving security parameters...</td></tr>';

    const result = await API.getStudentIPs(rollNumber);

    if (result.success && result.ips.length > 0) {
        noIPsMessage.classList.add('hidden');

        ipTableBody.innerHTML = result.ips.map(ip => `
            <tr class="hover:bg-white/5">
                <td class="px-4 py-3 font-mono text-sm text-slate-300 font-bold">${ip.ipAddress}</td>
                <td class="px-4 py-3">
                    <!-- BUG #11: Redundant status markers -->
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ip.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} uppercase border border-white/5">
                        <span class="material-icons text-[10px]">${ip.isActive ? 'check' : 'lock'}</span>
                        ${ip.isActive ? 'ACTIVE' : 'LOCKED'}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex gap-2">
                        <button onclick="toggleIP('${ip.id}')" class="p-1.5 bg-white/5 hover:bg-amber-500/20 hover:text-amber-500 rounded-md transition-all">
                            <span class="material-icons text-xs">${ip.isActive ? 'lock_open' : 'lock'}</span>
                        </button>
                        <button onclick="deleteIP('${ip.id}')" class="p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-md transition-all">
                            <span class="material-icons text-xs">delete_sweep</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } else {
        ipTableBody.innerHTML = '';
        noIPsMessage.classList.remove('hidden');
    }
}

window.toggleIP = async function (ipId) {
    const result = await API.toggleIP(ipId);
    if (result.success) {
        showToast(`IP Status: ${result.isActive ? 'Open' : 'Restricted'}`, 'success');
        loadIPsForUser(currentManagingUser);
        loadUsers();
    } else {
        showToast(result.error, 'error');
    }
};

window.deleteIP = async function (ipId) {
    if (confirm('Deauthorize this IP address?')) {
        const result = await API.removeIP(ipId);
        if (result.success) {
            showToast('Security Key Removed', 'success');
            loadIPsForUser(currentManagingUser);
            loadUsers();
        } else {
            showToast(result.error, 'error');
        }
    }
};

async function loadAttendance() {
    if (!attendanceTableBody) return;

    // BUG #15: Loading state indicator
    attendanceTableBody.innerHTML = '<tr><td colspan="4" class="py-10 text-center"><span class="material-icons spinner text-primary">sync</span><p class="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Fetching records...</p></td></tr>';

    const dateFilter = document.getElementById('filterDate')?.value;
    const rollFilter = document.getElementById('filterRoll')?.value;

    const filters = {};
    if (dateFilter) filters.date = dateFilter;
    if (rollFilter) filters.rollNumber = rollFilter;
    if (currentStatusFilter) filters.status = currentStatusFilter;

    const attendance = await API.getAttendance(filters);

    if (attendance.length === 0) {
        attendanceTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-10 text-slate-500 italic">No historical records found for these parameters</td></tr>';
        return;
    }

    attendanceTableBody.innerHTML = attendance.map(record => {
        // BUG #11: Improved status badges for attendance
        let statusBadge = record.status === 'Clock In'
            ? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-green-500/10 text-green-500 font-bold border border-green-500/10 uppercase"><span class="material-icons text-[10px]">login</span> Clock In</span>'
            : '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-primary/10 text-primary font-bold border border-primary/10 uppercase"><span class="material-icons text-[10px]">logout</span> Clock Out</span>';

        return `
        <tr class="hover:bg-white/5 transition-colors">
            <td class="px-6 py-4 text-sm font-mono text-primary font-bold">${record.rollNumber}</td>
            <td class="px-6 py-4 text-sm text-slate-300 font-medium">${UTILS.formatDate(record.timestamp)}</td>
            <td class="px-6 py-4 text-sm font-mono text-slate-500">${record.ipUsed || '-'}</td>
            <td class="px-6 py-4">${statusBadge}</td>
        </tr>
    `}).join('');
}

window.downloadAttendanceExcel = async function () {
    const dateFilter = document.getElementById('filterDate')?.value;
    const rollFilter = document.getElementById('filterRoll')?.value;

    const filters = {};
    if (dateFilter) filters.date = dateFilter;
    if (rollFilter) filters.rollNumber = rollFilter;
    if (currentStatusFilter) filters.status = currentStatusFilter;

    showToast('Preparing Excel Report...', 'info');

    const attendance = await API.getAttendance(filters);

    if (attendance.length === 0) {
        showToast('No records to export', 'error');
        return;
    }

    // Format data for Excel
    const excelData = attendance.map(r => ({
        'Roll Number': r.rollNumber || 'N/A',
        'Date': r.date,
        'Time': UTILS.formatDate(r.timestamp).split(', ')[1] || '-',
        'Status': r.status,
        'IP Address': r.ipUsed || 'Unknown',
        'Coordinates': `${r.latitude || '-'}/${r.longitude || '-'}`
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Records");

    // Generate filename based on filters
    let fileName = 'Attendance_Report';
    if (dateFilter) fileName += `_${dateFilter}`;
    if (rollFilter) fileName += `_${rollFilter}`;
    fileName += '.xlsx';

    // Download the file
    XLSX.writeFile(wb, fileName);
    showToast('Report Downloaded', 'success');
};


async function loadViolations() {
    if (!violationTableBody) return;
    // BUG #15: Loading state indicator
    violationTableBody.innerHTML = '<tr><td colspan="6" class="py-10 text-center"><span class="material-icons spinner text-red-500">sync</span><p class="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Scanning violations...</p></td></tr>';
    const violations = await API.getViolations();

    if (violations.length === 0) {
        violationTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-slate-500 italic">No security violations detected</td></tr>';
        return;
    }

    violationTableBody.innerHTML = violations.map(v => `
        <tr class="hover:bg-white/5 transition-colors">
            <td class="px-6 py-4 text-sm font-mono text-red-500 font-bold">${v.rollNumber}</td>
            <td class="px-6 py-4 text-sm text-slate-300 font-medium">${UTILS.formatDate(v.timestamp)}</td>
            <td class="px-6 py-4 text-sm font-mono text-slate-500">${v.latitude.toFixed(6)}, ${v.longitude.toFixed(6)}</td>
            <td class="px-6 py-4 text-sm text-slate-400 font-bold">${v.distance ? Math.round(v.distance) + 'm' : 'N/A'}</td>
            <td class="px-6 py-4 text-sm font-bold">${v.type || 'Geofence Breach'}</td>
            <td class="px-6 py-4"><span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-red-500/10 text-red-500 font-bold border border-red-500/20 uppercase"><span class="material-icons text-[10px]">report_problem</span> OUTSIDE ZONE</span></td>
        </tr>
    `).join('');
}

/**
 * Phase 2: IP Request Management
 */
async function loadIPRequests() {
    const tableBody = document.getElementById('ipRequestsTableBody');
    const counter = document.getElementById('pendingRequestCount');
    if (!tableBody) return;

    // BUG #15: Loading state indicator
    tableBody.innerHTML = '<tr><td colspan="5" class="py-10 text-center"><span class="material-icons spinner text-primary">sync</span><p class="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Checking for requests...</p></td></tr>';

    const result = await API.getAllIPRequests();
    if (result.success) {
        const pending = result.requests.filter(r => r.status === 'Pending');
        counter.textContent = `${pending.length} Pending`;

        if (result.requests.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="py-10 text-center text-slate-500 italic">No IP registration requests found</td></tr>';
            return;
        }

        tableBody.innerHTML = result.requests.map(r => `
            <tr class="${r.status === 'Pending' ? 'bg-primary/5' : ''}">
                <td class="px-6 py-4">
                    <div class="font-bold text-white">${r.rollNumber}</div>
                    <div class="text-[10px] text-slate-500">Student ID: ${r.student?._id || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 font-mono text-primary font-bold">${r.ipAddress}</td>
                <td class="px-6 py-4">
                    <div class="text-xs text-slate-300 font-bold">${r.systemIdentifier}</div>
                    <div class="text-[11px] text-slate-500 italic">${r.justification}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-col gap-1">
                        <span class="text-[9px] uppercase font-black ${r.auditResults.vpnDetected ? 'text-red-500' : 'text-green-500'}">VPN: ${r.auditResults.vpnDetected ? 'DETECTED' : 'CLEAN'}</span>
                        <span class="text-[9px] uppercase font-black ${r.auditResults.conflictCount > 0 ? 'text-amber-500' : 'text-slate-500'}">
                            Conflict: ${r.auditResults.conflictCount > 0 ? `${r.auditResults.conflictCount} Users (${r.auditResults.existingUsers.join(', ')})` : 'None'}
                        </span>
                        <span class="text-[9px] uppercase font-black ${r.status === 'Approved' ? 'text-green-500' : r.status === 'Pending' ? 'text-amber-500' : 'text-red-500'}">${r.status}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    ${r.status === 'Pending' ? `
                        <div class="flex gap-2">
                            <button onclick="reviewIPRequest('${r._id}', 'Approved')" class="p-2 bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all" title="Approve">
                                <span class="material-icons text-sm">check</span>
                            </button>
                            <button onclick="reviewIPRequest('${r._id}', 'Rejected')" class="p-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all" title="Reject">
                                <span class="material-icons text-sm">close</span>
                            </button>
                        </div>
                    ` : `<span class="text-xs text-slate-500">Reviewed</span>`}
                </td>
            </tr>
        `).join('');
    }
}

window.reviewIPRequest = async function (requestId, status) {
    const adminComment = prompt(`Enter optional comment for ${status}:`);
    const result = await API.reviewIPRequest(requestId, {
        status,
        adminComment: adminComment || ''
    });
    if (result.success) {
        showToast(`Request ${status} successfully`, 'success');
        loadIPRequests();
        loadUsers();
    } else {
        showToast(result.message, 'error');
    }
}

/**
 * Phase 2: Broadcasts
 */
async function handleBroadcastSubmission(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons animate-spin">sync</span> SENDING...';

    const broadcastData = {
        title: document.getElementById('broadcastTitle').value,
        message: document.getElementById('broadcastMessage').value,
        priority: document.getElementById('broadcastPriority').value,
        targetAudience: document.getElementById('broadcastAudience').value,
        senderId: 'admin' // Fixed for now, could be dynamic
    };

    const result = await API.broadcastNotification(broadcastData);
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons">send</span> SEND BROADCAST';

    if (result.success) {
        showToast('Broadcast sent successfully!');
        e.target.reset();
        loadBroadcastHistory();
    } else {
        showToast(result.message, 'error');
    }
}

async function loadBroadcastHistory() {
    const container = document.getElementById('broadcastHistory');
    if (!container) return;

    // BUG #15: Loading state indicator
    container.innerHTML = '<div class="py-10 text-center"><span class="material-icons spinner text-primary">sync</span><p class="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Retrieving history...</p></div>';

    const result = await API.getAllNotifications();

    if (result.success && result.notifications.length > 0) {
        container.innerHTML = result.notifications.map(n => `
            <div class="glass-panel p-4 rounded-xl border-l-4 ${n.priority === 'Urgent' ? 'border-red-500' : 'border-primary'} bg-white/5">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-white">${n.title}</h4>
                    <span class="text-[10px] text-slate-500">${new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p class="text-sm text-slate-400">${n.message}</p>
                <div class="mt-3 flex gap-2">
                    <span class="text-[9px] uppercase font-bold px-2 py-0.5 bg-white/10 rounded">${n.targetAudience}</span>
                    <span class="text-[9px] uppercase font-bold px-2 py-0.5 bg-white/10 rounded text-slate-400">${n.priority}</span>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<div class="py-10 text-center text-slate-500 italic text-sm">No broadcast history found</div>';
    }
}

/**
 * Phase 2: Audit Logs
 */
async function loadAuditLogs() {
    if (!auditLogsTableBody) return;

    // BUG #15: Loading state indicator
    auditLogsTableBody.innerHTML = '<tr><td colspan="5" class="py-10 text-center"><span class="material-icons spinner text-primary">sync</span><p class="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Loading trails...</p></td></tr>';

    const result = await API.getAuditLogs();
    if (result.success) {
        auditLogsTableBody.innerHTML = result.logs.map(log => `
            <tr>
                <td class="px-6 py-4 text-slate-500">${new Date(log.createdAt).toLocaleString()}</td>
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-300">${log.performedBy?.name || 'System'}</div>
                    <div class="text-[10px] text-slate-500">${log.performedBy?.rollNumber || 'ROOT'}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${log.severity === 'Critical' ? 'bg-red-500/10 text-red-500' :
                log.severity === 'High' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-blue-500/10 text-blue-500'
            } uppercase">
                        ${log.action}
                    </span>
                </td>
                <td class="px-6 py-4 text-xs text-slate-400 max-w-xs truncate" title="${JSON.stringify(log.details)}">
                    ${log.targetType}: ${log.targetId}
                </td>
                <td class="px-6 py-4 font-mono text-[10px] text-slate-500">${log.ipAddress || '127.0.0.1'}</td>
            </tr>
        `).join('');
    }
}

/**
 * Phase 2: Geofencing & Branch Management
 */
async function loadBranches() {
    const tableBody = document.getElementById('branchTableBody');
    if (!tableBody) return;

    // BUG #15: Loading state indicator
    tableBody.innerHTML = '<tr><td colspan="5" class="py-10 text-center"><span class="material-icons spinner text-primary">sync</span><p class="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Mapping zones...</p></td></tr>';

    const result = await API.getBranches();
    if (result.success) {
        if (result.branches.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="py-10 text-center text-slate-500 italic">No attendance zones configured</td></tr>';
            return;
        }

        tableBody.innerHTML = result.branches.map(b => `
            <tr>
                <td class="px-6 py-4">
                    <div class="font-bold text-white">${b.name}</div>
                    <div class="text-[10px] text-slate-500">${b.isMainHQ ? 'PRIMARY HEADQUARTERS' : 'BRANCH OFFICE'}</div>
                </td>
                <td class="px-6 py-4 font-mono text-xs text-slate-400">
                    ${b.coordinates.lat.toFixed(6)}, ${b.coordinates.lng.toFixed(6)}
                </td>
                <td class="px-6 py-4 text-sm text-slate-300 font-bold">${b.radius}m</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${b.status === 'Active' ? 'bg-green-500/10 text-green-500' :
                b.status === 'Maintenance' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-red-500/10 text-red-500'
            } uppercase">
                        ${b.status}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <button onclick="deleteBranch('${b._id}')" class="p-2 text-slate-500 hover:text-red-500 transition-colors">
                        <span class="material-icons text-sm">delete_outline</span>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

async function handleBranchSubmission(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons animate-spin">sync</span> SAVING...';

    const branchData = {
        name: document.getElementById('branchName').value,
        coordinates: {
            lat: parseFloat(document.getElementById('branchLat').value),
            lng: parseFloat(document.getElementById('branchLng').value)
        },
        radius: parseInt(document.getElementById('branchRadius').value),
        authorizedIPRanges: document.getElementById('branchIPRanges').value.split(',').map(s => s.trim()).filter(s => s),
        status: 'Active'
    };

    const result = await API.createBranch(branchData);
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons">save</span> SAVE BRANCH';

    if (result.success) {
        showToast('Branch location saved successfully!');
        e.target.reset();
        loadBranches();
    } else {
        showToast(result.message || 'Failed to save branch', 'error');
    }
}

window.deleteBranch = async function (id) {
    if (!confirm('Are you sure you want to delete this zone? All geofencing for this location will be disabled.')) return;

    const result = await API.deleteBranch(id);
    if (result.success) {
        showToast('Branch location deleted');
        loadBranches();
    } else {
        showToast(result.message || 'Failed to delete branch', 'error');
    }
}

/**
 * Phase 2: Live Monitor Map
 */
async function initLiveMap() {
    const container = document.getElementById('liveMap');
    if (!container) return;

    if (!liveMap) {
        // Initialize map centered on India or a default coords
        liveMap = L.map('liveMap', {
            zoomControl: false,
            attributionControl: false
        }).setView([20.5937, 78.9629], 5);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(liveMap);

        L.control.zoom({ position: 'bottomright' }).addTo(liveMap);
    } else {
        setTimeout(() => liveMap.invalidateSize(), 100);
    }

    // Load branch geofences
    const result = await API.getBranches();
    if (result.success) {
        // Clear old markers/circles
        mapMarkers.forEach(m => liveMap.removeLayer(m));
        mapMarkers = [];

        if (result.branches.length > 0) {
            const bounds = L.latLngBounds();

            result.branches.forEach(b => {
                const pos = [b.coordinates.lat, b.coordinates.lng];

                // Add Circle for geofence
                const circle = L.circle(pos, {
                    color: '#6366f1',
                    fillColor: '#6366f1',
                    fillOpacity: 0.2,
                    radius: b.radius
                }).addTo(liveMap);

                // Add marker
                const marker = L.marker(pos).addTo(liveMap)
                    .bindPopup(`<b class="text-slate-900">${b.name}</b><br><span class="text-xs text-slate-600">${b.radius}m Radius</span>`);

                mapMarkers.push(circle, marker);
                bounds.extend(pos);
            });

            liveMap.fitBounds(bounds, { padding: [50, 50] });
        }
    }
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
    }, 100);

    setTimeout(() => {
        toast.classList.add('translate-y-20');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
