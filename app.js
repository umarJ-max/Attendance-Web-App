// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(registration => {
        console.log('Service Worker registered');
    }).catch(error => {
        console.log('Service Worker registration failed:', error);
    });
}

// App State
const app = {
    storageKey: 'studytrackData',
    data: {
        records: [],
        subjects: []
    },
    theme: 'light'
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupTheme();
    setupEventListeners();
    setupTabs();
    updateDate();
    updateStats();
    renderHistory();
    renderSubjects();
    checkOnlineStatus();
    handleUrlParams();
});

// Theme Management
function setupTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    app.theme = saved;
    applyTheme();
}

function toggleTheme() {
    app.theme = app.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', app.theme);
    applyTheme();
}

function applyTheme() {
    const btn = document.getElementById('themeToggle');
    if (app.theme === 'dark') {
        document.body.classList.add('dark-mode');
        btn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        btn.textContent = '🌙';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Dashboard
    document.getElementById('quickPresentBtn').addEventListener('click', () => {
        if (app.data.subjects.length === 0) {
            alert('📚 Please add a subject first before marking attendance!');
            switchTab('subjects');
            return;
        }
        switchTab('attendance');
    });
    document.getElementById('markPresentBtn').addEventListener('click', () => markAttendance('present'));
    document.getElementById('markAbsentBtn').addEventListener('click', () => markAttendance('absent'));
    document.getElementById('markPresentBtn2').addEventListener('click', () => markAttendance('present'));
    document.getElementById('markAbsentBtn2').addEventListener('click', () => markAttendance('absent'));
    
    // History
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    
    // Subjects
    document.getElementById('addSubjectBtn').addEventListener('click', openSubjectModal);
    document.getElementById('saveSubjectBtn').addEventListener('click', saveNewSubject);
    document.getElementById('cancelSubjectBtn').addEventListener('click', closeSubjectModal);
    document.querySelector('.modal-close').addEventListener('click', closeSubjectModal);
    
    // Settings
    document.getElementById('downloadDataBtn').addEventListener('click', downloadData);
    document.getElementById('syncBtn').addEventListener('click', checkOnlineStatus);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllData);
    
    // Online/Offline
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
}

// Tab Navigation
function setupTabs() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Update page based on tab
    if (tabName === 'analytics') {
        updateAnalytics();
    } else if (tabName === 'subjects') {
        renderSubjects();
    }
}

// Handle URL parameters for quick actions
function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'present') {
        markAttendance('present');
    } else if (action === 'absent') {
        markAttendance('absent');
    }
}

// Update Date Display
function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', options);
    document.getElementById('dateDisplay').textContent = dateStr;
}

// Mark Attendance
function markAttendance(status) {
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];
    const subjectSelect = document.getElementById('subjectSelect');
    const selectedSubject = parseInt(subjectSelect?.value); // Convert to number
    
    // Validate that a subject is selected
    if (!selectedSubject) {
        alert('⚠️ Please select a subject before marking attendance!');
        subjectSelect?.focus();
        return;
    }
    
    // Find the subject object to get its name for notification
    const subjectObj = app.data.subjects.find(s => s.id === selectedSubject);
    if (!subjectObj) {
        alert('❌ Selected subject not found. Please try again.');
        return;
    }
    
    // Create composite key: date|subject for unique identification
    const compositeKey = `${dateKey}|${selectedSubject}`;
    
    // Check if already marked for this subject on this date
    const existingRecordIndex = app.data.records.findIndex(r => {
        const recordKey = `${r.date}|${r.subject}`;
        return recordKey === compositeKey;
    });
    
    if (existingRecordIndex !== -1) {
        // Update existing record for this subject on this date
        app.data.records[existingRecordIndex].status = status;
        app.data.records[existingRecordIndex].timestamp = new Date().toISOString();
    } else {
        // Create new record for this subject
        app.data.records.push({
            date: dateKey,
            status: status,
            subject: selectedSubject,
            timestamp: new Date().toISOString()
        });
    }
    
    saveData();
    updateStats();
    updateRecentActivity();
    renderHistory();
    showStatusNotification(status, subjectObj.name);
}

// Show Status Notification
function showStatusNotification(status, subjectName = 'Attendance') {
    const messageEl = document.getElementById('todayStatus');
    messageEl.classList.remove('present', 'absent');
    messageEl.classList.add(status);
    
    if (status === 'present') {
        messageEl.innerHTML = `<p><strong>✓ ${subjectName} - Present</strong><br><span style="font-size: 12px;">Great! Keep attending regularly</span></p>`;
    } else {
        messageEl.innerHTML = `<p><strong>✗ ${subjectName} - Absent</strong><br><span style="font-size: 12px;">You can update this record later</span></p>`;
    }
    
    // Auto hide after 4 seconds
    setTimeout(() => {
        messageEl.innerHTML = '<p class="empty-state">No attendance marked yet</p>';
        messageEl.className = 'today-status';
    }, 4000);
}

// Update Recent Activity (for dashboard)
function updateRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    
    const sortedRecords = [...app.data.records].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    if (sortedRecords.length === 0) {
        activityList.innerHTML = '<p class="empty-state">No recent activity yet</p>';
        return;
    }
    
    activityList.innerHTML = sortedRecords.map(record => {
        const date = new Date(record.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Get subject name from subject ID
        const subjectObj = app.data.subjects.find(s => s.id == record.subject);
        const subjectName = subjectObj ? subjectObj.name : 'Unknown Subject';
        const subject = ` - ${subjectName}`;
        
        const status = record.status === 'present' ? '✓ Present' : '✗ Absent';
        
        return `
            <div class="activity-item ${record.status}">
                <div>
                    <div class="activity-date">${dateStr}${subject}</div>
                </div>
                <div class="activity-status">${status}</div>
            </div>
        `;
    }).join('');
}

// Update Statistics
function updateStats() {
    const present = app.data.records.filter(r => r.status === 'present').length;
    const absent = app.data.records.filter(r => r.status === 'absent').length;
    const total = app.data.records.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    document.getElementById('presentCount').textContent = present;
    document.getElementById('absentCount').textContent = absent;
    document.getElementById('attendancePercentage').textContent = percentage + '%';
}

// Render History
function renderHistory() {
    const historyList = document.getElementById('historyList');
    
    if (app.data.records.length === 0) {
        historyList.innerHTML = '<p class="empty-state">📅 No attendance records yet</p>';
        return;
    }
    
    const sortedRecords = [...app.data.records].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    historyList.innerHTML = sortedRecords.map(record => {
        const date = new Date(record.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        // Get subject name from subject ID
        const subjectObj = app.data.subjects.find(s => s.id == record.subject);
        const subjectName = subjectObj ? subjectObj.name : 'Unknown Subject';
        const subject = `<span style="color: #6b7280; font-size: 12px;"> • ${subjectName}</span>`;
        
        const status = record.status === 'present' ? '✓ Present' : '✗ Absent';
        
        return `
            <div class="history-item ${record.status}">
                <span class="history-date">${dateStr}${subject}</span>
                <span class="history-status">${status}</span>
            </div>
        `;
    }).join('');
}

// Clear History
function clearHistory() {
    if (confirm('Clear all attendance records? This cannot be undone.')) {
        app.data.records = [];
        saveData();
        updateStats();
        updateRecentActivity();
        renderHistory();
    }
}

// Subject Management
function openSubjectModal() {
    document.getElementById('subjectModal').classList.add('active');
    document.getElementById('subjectName').focus();
}

function closeSubjectModal() {
    document.getElementById('subjectModal').classList.remove('active');
    document.getElementById('subjectName').value = '';
    document.getElementById('subjectCode').value = '';
    document.getElementById('subjectColor').value = '#6366f1';
}

function saveNewSubject() {
    const name = document.getElementById('subjectName').value.trim();
    const code = document.getElementById('subjectCode').value.trim();
    const color = document.getElementById('subjectColor').value;
    
    if (!name) {
        alert('Please enter a subject name');
        return;
    }
    
    app.data.subjects.push({
        id: Date.now(),
        name: name,
        code: code || name,
        color: color,
        createdAt: new Date().toISOString()
    });
    
    saveData();
    renderSubjects();
    updateSubjectSelect();
    closeSubjectModal();
}

function renderSubjects() {
    const subjectsList = document.getElementById('subjectsList');
    
    if (app.data.subjects.length === 0) {
        subjectsList.innerHTML = '<p class="empty-state">📚 No subjects added yet. Create one to start tracking!</p>';
        return;
    }
    
    subjectsList.innerHTML = app.data.subjects.map(subject => {
        // Filter records by subject ID (not name) for proper subject-wise tracking
        const records = app.data.records.filter(r => r.subject === subject.id);
        const present = records.filter(r => r.status === 'present').length;
        const total = records.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        
        return `
            <div class="subject-card">
                <button class="subject-delete" onclick="deleteSubject(${subject.id})" title="Delete subject">×</button>
                <div class="subject-color-bar" style="background-color: ${subject.color}"></div>
                <h3 class="subject-name">${subject.name}</h3>
                <div class="subject-code">📝 ${subject.code}</div>
                <div class="subject-stats">
                    <div class="subject-stat">
                        <div class="subject-stat-value">${present}</div>
                        <div class="subject-stat-label">Classes</div>
                    </div>
                    <div class="subject-stat">
                        <div class="subject-stat-value">${total}</div>
                        <div class="subject-stat-label">Total</div>
                    </div>
                    <div class="subject-stat">
                        <div class="subject-stat-value">${percentage}%</div>
                        <div class="subject-stat-label">Rate</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function deleteSubject(id) {
    if (confirm('Delete this subject? Related attendance records will not be deleted.')) {
        const subject = app.data.subjects.find(s => s.id === id);
        app.data.subjects = app.data.subjects.filter(s => s.id !== id);
        saveData();
        renderSubjects();
        updateSubjectSelect();
    }
}

function updateSubjectSelect() {
    const select = document.getElementById('subjectSelect');
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Select a subject --</option>' + 
        app.data.subjects.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('');
    select.value = currentValue;
}

// Analytics
function updateAnalytics() {
    const present = app.data.records.filter(r => r.status === 'present').length;
    const absent = app.data.records.filter(r => r.status === 'absent').length;
    const total = app.data.records.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    // Update circle progress
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (percentage / 100) * circumference;
    document.getElementById('progressCircle').style.strokeDashoffset = offset;
    document.getElementById('progressText').textContent = percentage + '%';
    
    // Update stats
    document.getElementById('totalClasses').textContent = total;
    document.getElementById('classesAttended').textContent = present;
    document.getElementById('classesMissed').textContent = absent;
    
    // Subject analytics - filtered by subject ID
    const analyticsContainer = document.getElementById('subjectAnalytics');
    if (app.data.subjects.length === 0) {
        analyticsContainer.innerHTML = '<p class="empty-state">📊 No subjects to analyze. Create subjects to track attendance!</p>';
        return;
    }
    
    analyticsContainer.innerHTML = app.data.subjects.map(subject => {
        // Fixed: Filter by subject ID instead of name
        const records = app.data.records.filter(r => r.subject === subject.id);
        const present = records.filter(r => r.status === 'present').length;
        const total = records.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        
        // Color coding for attendance percentage
        let statusColor = '#ef4444'; // red
        if (percentage >= 75) statusColor = '#10b981'; // green
        else if (percentage >= 50) statusColor = '#f59e0b'; // orange
        
        return `
            <div class="subject-analytics-item">
                <div class="subject-analytics-name" style="border-left: 4px solid ${subject.color}; padding-left: 12px;">
                    <strong>${subject.name}</strong>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${subject.code}</div>
                </div>
                <div class="subject-analytics-stats">
                    <div><strong>${present}</strong>/${total} classes</div>
                    <div style="min-width: 60px; color: ${statusColor};"><strong>${percentage}%</strong></div>
                </div>
            </div>
        `;
    }).join('');
}

// Data Management
function saveData() {
    localStorage.setItem(app.storageKey, JSON.stringify(app.data));
}

function loadData() {
    const savedData = localStorage.getItem(app.storageKey);
    if (savedData) {
        app.data = JSON.parse(savedData);
    }
    updateSubjectSelect();
}

function downloadData() {
    const dataStr = JSON.stringify(app.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function clearAllData() {
    if (confirm('Delete ALL data including records and subjects?\n\nThis action CANNOT be undone!')) {
        if (confirm('Are you absolutely sure? This will erase everything.')) {
            app.data = { records: [], subjects: [] };
            saveData();
            updateStats();
            updateRecentActivity();
            renderHistory();
            renderSubjects();
            updateSubjectSelect();
            alert('All data has been cleared');
        }
    }
}

// Online/Offline
function checkOnlineStatus() {
    const syncStatusEl = document.getElementById('syncStatus');
    
    if (navigator.onLine) {
        syncStatusEl.textContent = '🟢 Online';
        syncStatusEl.className = 'sync-status online';
    } else {
        syncStatusEl.textContent = '🔴 Offline';
        syncStatusEl.className = 'sync-status';
    }
}

function handleOnline() {
    checkOnlineStatus();
}

function handleOffline() {
    checkOnlineStatus();
}

