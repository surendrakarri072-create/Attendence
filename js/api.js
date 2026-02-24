/**
 * Attendance Management System - API Client
 * Robust API communication with backend
 */

const API = {
    // Helper to get headers
    getHeaders() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    },

    // Private helper for robust API requests
    async _request(url, options = {}) {
        const requestId = Math.random().toString(36).substring(7);
        try {
            // Add cache busting to for non-POST requests or to be extra safe
            const separator = url.includes('?') ? '&' : '?';
            const finalUrl = `${url}${separator}v=${Date.now()}`;

            const finalOptions = {
                ...options,
                headers: {
                    ...this.getHeaders(),
                    ...(options.headers || {})
                }
            };

            if (CONFIG.DEBUG_MODE) {
                console.log(`[API Request ${requestId}]`, options.method || 'GET', url);
            }

            const response = await fetch(finalUrl, finalOptions);
            const text = await response.text();

            if (CONFIG.DEBUG_MODE) {
                console.log(`[API Response ${requestId}] Status:`, response.status);
            }

            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (err) {
                console.error(`[API Error ${requestId}] JSON Parse Error:`, err, 'Response Text:', text);
                throw {
                    status: response.status,
                    message: `Malformed Server Response`,
                    text: text
                };
            }

            if (!response.ok) {
                throw {
                    status: response.status,
                    message: data.message || data.error || `Server Error: ${response.status}`,
                    data: data
                };
            }

            return data;
        } catch (err) {
            console.error(`[API Exception ${requestId}]`, err);
            // Handle specific fetch errors (like connection refused)
            if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
                throw new Error('Connection Error: Unable to reach the server. Please check your internet connection.');
            }
            throw err;
        }
    },

    // --- Authentication ---
    async adminLogin(username, password) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/auth/admin/login`, {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        } catch (err) {
            console.error('Admin Login API Error:', err);

            // Extract the most descriptive message possible
            let errorMessage = 'Login failed due to a server error.';

            if (err.name === 'Error' && err.message.includes('Connection Error')) {
                errorMessage = 'Connection Error: Unable to reach the security server.';
            } else if (err.status === 401) {
                errorMessage = 'Invalid admin credentials. Please check your username and password.';
            } else if (err.status === 404) {
                errorMessage = 'API Endpoint not found (404). Check backend configuration.';
            } else if (err.status === 403) {
                errorMessage = err.data?.message || 'Administrative access denied.';
            } else if (err.message) {
                errorMessage = err.message;
            }

            return {
                success: false,
                message: errorMessage,
                error: err.data?.error || 'LOGIN_ERROR',
                status: err.status,
                details: err
            };
        }
    },

    async userLogin(rollNumber, password) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/auth/user/login`, {
                method: 'POST',
                body: JSON.stringify({ rollNumber, password })
            });
        } catch (err) {
            console.error('User Login API Error:', err);
            return {
                success: false,
                message: err.status === 401 ? 'Invalid roll number or password.' :
                    err.status === 404 ? 'User not found or login service unavailable.' :
                        err.status === 403 ? (err.data?.message || 'Access denied from this network.') :
                            (err.message || 'Login failed. Please check your connection.'),
                error: err.data?.error || 'LOGIN_ERROR',
                currentIp: err.data?.currentIp
            };
        }
    },

    // --- Users ---
    async getUsers() {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/users`);
        } catch (err) {
            return [];
        }
    },

    async addUser(userData) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/users`, {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    async removeUser(rollNumber) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/users/${rollNumber}`, {
                method: 'DELETE'
            });
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    // --- Attendance ---
    async getAttendance(filters = {}) {
        try {
            let url = `${CONFIG.API_BASE_URL}/attendance`;
            const params = new URLSearchParams(filters).toString();
            if (params) url += `?${params}`;
            return await this._request(url);
        } catch (err) {
            return [];
        }
    },

    async getAttendanceStats() {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/attendance/stats`);
        } catch (err) {
            return { success: false };
        }
    },

    async markAttendance(data) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/attendance/mark`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (err) {
            return {
                success: false,
                message: err.message || 'Failed to mark attendance',
                error: err.data?.error || 'MARK_FAILED'
            };
        }
    },

    // --- IP Management (Admin) ---
    async getStudentIPs(rollNumber) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/ip/student/${rollNumber}`);
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async addIP(rollNumber, ipAddress) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/ip/add`, {
                method: 'POST',
                body: JSON.stringify({ rollNumber, ipAddress })
            });
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async toggleIP(ipId) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/ip/toggle/${ipId}`, {
                method: 'PUT'
            });
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async removeIP(ipId) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/ip/remove/${ipId}`, {
                method: 'DELETE'
            });
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    // --- IP-based Attendance Check ---
    async checkIPAuthorization(rollNumber) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/attendance/check-ip`, {
                method: 'POST',
                body: JSON.stringify({ rollNumber })
            });
        } catch (err) {
            console.error('Check IP API Error:', err);
            return {
                success: false,
                message: err.message || 'Failed to verify network status',
                error: err.data?.error || 'CHECK_IP_FAILED'
            };
        }
    },

    // --- Violations ---
    async getViolations() {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/attendance/violations`);
        } catch (err) {
            return [];
        }
    },


    // --- IP Registration Requests (Phase 2) ---
    async submitIPRequest(data) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/ip-requests/submit`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    async getMyIPRequests(rollNumber) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/ip-requests/my-requests/${rollNumber}`);
        } catch (err) {
            return { success: false, requests: [] };
        }
    },

    async getAllIPRequests() {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/ip-requests/all`);
        } catch (err) {
            return { success: false, requests: [] };
        }
    },

    async reviewIPRequest(requestId, reviewData) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/ip-requests/review/${requestId}`, {
                method: 'PUT',
                body: JSON.stringify(reviewData)
            });
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    // --- Notifications (Phase 2) ---
    async getStudentNotifications(rollNumber) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/notifications/student/${rollNumber}`);
        } catch (err) {
            return { success: false, notifications: [] };
        }
    },

    async getAllNotifications() {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/notifications/all`);
        } catch (err) {
            return { success: false, notifications: [] };
        }
    },

    async markNotificationAsRead(notificationId, userId) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/notifications/read/${notificationId}`, {
                method: 'PUT',
                body: JSON.stringify({ userId })
            });
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    async broadcastNotification(data) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/notifications/broadcast`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    // --- Branches & Audit (Phase 2) ---
    async getBranches() {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/branches`);
        } catch (err) {
            return { success: false, branches: [] };
        }
    },

    async createBranch(data) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/branches`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    async deleteBranch(id) {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/branches/${id}`, {
                method: 'DELETE'
            });
        } catch (err) {
            return { success: false, message: err.message };
        }
    },

    async getAuditLogs() {
        try {
            return await this._request(`${CONFIG.API_BASE_URL}/audit-logs`);
        } catch (err) {
            return { success: false, logs: [] };
        }
    }
};
