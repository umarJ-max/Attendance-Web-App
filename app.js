// ============================================
//  StudyTrack v2 — App Logic
// ============================================

const app = {
    storageKey: 'studytrack_v2',
    data: { records: [], subjects: [] }
};

// ---- BOOT ----
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupTabs();
    setupNav();
    setupEvents();
    updateDate();
    updateStats();
    renderRecentActivity();
    renderHistory();
    renderSubjects();
    checkOnlineStatus();
});

// ---- DATE ----
function updateDate() {
    const el = document.getElementById('dateDisplay');
    if (!el) return;
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    el.textContent = new Date().toLocaleDateString('en-US', opts).toUpperCase();
}

// ---- TABS ----
function setupTabs() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            switchTab(item.dataset.tab);
            // close mobile sidebar
            closeMobileSidebar();
        });
    });

    // "View all" link buttons
    document.querySelectorAll('.link-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

function switchTab(name) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const navEl = document.querySelector(`.nav-item[data-tab="${name}"]`);
    if (navEl) navEl.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const tabEl = document.getElementById(`${name}-tab`);
    if (tabEl) tabEl.classList.add('active');

    if (name === 'analytics') updateAnalytics();
    if (name === 'subjects')  renderSubjects();
}

// ---- MOBILE SIDEBAR ----
function setupNav() {
    const btn     = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');

    btn?.addEventListener('click', () => {
        const open = sidebar.classList.toggle('open');
        overlay.classList.toggle('active', open);
    });

    overlay?.addEventListener('click', closeMobileSidebar);
}

function closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('mobileOverlay')?.classList.remove('active');
}

// ---- EVENTS ----
function setupEvents() {
    // Quick mark (dashboard button → go to attendance tab)
    document.getElementById('quickPresentBtn')?.addEventListener('click', () => {
        if (app.data.subjects.length === 0) {
            showToast('Add a subject first', 'info');
            switchTab('subjects');
            return;
        }
        switchTab('attendance');
    });

    // Dashboard mark buttons
    document.getElementById('markPresentBtn')?.addEventListener('click', () => markAttendance('present'));
    document.getElementById('markAbsentBtn')?.addEventListener('click', () => markAttendance('absent'));

    // Attendance tab mark buttons
    document.getElementById('markPresentBtn2')?.addEventListener('click', () => markAttendance('present'));
    document.getElementById('markAbsentBtn2')?.addEventListener('click', () => markAttendance('absent'));

    // History
    document.getElementById('clearHistoryBtn')?.addEventListener('click', clearHistory);

    // Subjects
    document.getElementById('addSubjectBtn')?.addEventListener('click', openSubjectModal);
    document.getElementById('saveSubjectBtn')?.addEventListener('click', saveNewSubject);
    document.getElementById('cancelSubjectBtn')?.addEventListener('click', closeSubjectModal);
    document.getElementById('cancelSubjectBtn2')?.addEventListener('click', closeSubjectModal);

    // Close modal on overlay click
    document.getElementById('subjectModal')?.addEventListener('click', e => {
        if (e.target === document.getElementById('subjectModal')) closeSubjectModal();
    });

    // Enter key in modal inputs
    document.getElementById('subjectName')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') saveNewSubject();
    });

    // Settings
    document.getElementById('downloadDataBtn')?.addEventListener('click', downloadData);
    document.getElementById('syncBtn')?.addEventListener('click', checkOnlineStatus);
    document.getElementById('clearAllBtn')?.addEventListener('click', clearAllData);

    // Online/offline
    window.addEventListener('online',  checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);
}

// ---- MARK ATTENDANCE ----
function markAttendance(status) {
    const select  = document.getElementById('subjectSelect');
    const subjectId = parseInt(select?.value);

    if (!subjectId) {
        showToast('Select a subject first', 'info');
        if (select) select.focus();
        return;
    }

    const subject = app.data.subjects.find(s => s.id === subjectId);
    if (!subject) { showToast('Subject not found', 'info'); return; }

    const dateKey = new Date().toISOString().split('T')[0];
    const compositeKey = `${dateKey}|${subjectId}`;

    const existing = app.data.records.findIndex(r => `${r.date}|${r.subject}` === compositeKey);

    if (existing !== -1) {
        app.data.records[existing].status    = status;
        app.data.records[existing].timestamp = new Date().toISOString();
    } else {
        app.data.records.push({
            date: dateKey,
            status,
            subject: subjectId,
            timestamp: new Date().toISOString()
        });
    }

    saveData();
    updateStats();
    renderRecentActivity();
    renderHistory();
    showTodayStatus(status, subject.name);
    showToast(
        status === 'present'
            ? `Present — ${subject.name}`
            : `Absent — ${subject.name}`,
        status
    );
}

// ---- TODAY STATUS ----
function showTodayStatus(status, subjectName) {
    const el = document.getElementById('todayStatus');
    if (!el) return;
    el.className = `today-status ${status}`;
    el.innerHTML = `
        <div class="status-result ${status}">
            <strong>${status === 'present' ? '✓ Present' : '✗ Absent'} — ${subjectName}</strong>
            <small>${status === 'present' ? 'Attendance recorded successfully' : 'Marked as absent'}</small>
        </div>`;

    setTimeout(() => {
        el.className = 'today-status';
        el.innerHTML = '<span class="empty-msg">No attendance marked yet today</span>';
    }, 5000);
}

// ---- STATS ----
function updateStats() {
    const present    = app.data.records.filter(r => r.status === 'present').length;
    const absent     = app.data.records.filter(r => r.status === 'absent').length;
    const total      = app.data.records.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : null;

    document.getElementById('presentCount').textContent    = present;
    document.getElementById('absentCount').textContent     = absent;
    document.getElementById('attendancePercentage').textContent = percentage !== null ? `${percentage}%` : '—';
}

// ---- RECENT ACTIVITY ----
function renderRecentActivity() {
    const el = document.getElementById('recentActivity');
    if (!el) return;

    const sorted = [...app.data.records]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 6);

    if (sorted.length === 0) {
        el.innerHTML = '<p class="empty-msg">No recent activity</p>';
        return;
    }

    el.innerHTML = sorted.map(r => {
        const dateStr = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const subject = app.data.subjects.find(s => s.id === r.subject);
        const subjectName = subject ? subject.name : 'Unknown';
        return `
            <div class="activity-item">
                <div>
                    <div class="activity-date">${dateStr}</div>
                    <div class="activity-sub">${subjectName}${subject?.code ? ` · ${subject.code}` : ''}</div>
                </div>
                <span class="activity-badge ${r.status}">${r.status === 'present' ? 'Present' : 'Absent'}</span>
            </div>`;
    }).join('');
}

// ---- HISTORY ----
function renderHistory() {
    const el = document.getElementById('historyList');
    if (!el) return;

    if (app.data.records.length === 0) {
        el.innerHTML = '<p class="empty-msg">No records yet</p>';
        return;
    }

    const sorted = [...app.data.records].sort((a, b) => new Date(b.date) - new Date(a.date));

    el.innerHTML = sorted.map(r => {
        const dateStr = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const subject = app.data.subjects.find(s => s.id === r.subject);
        const subjectName = subject ? subject.name : 'Unknown Subject';
        return `
            <div class="history-item">
                <div>
                    <div class="history-date">${dateStr}</div>
                    <div class="history-subject">${subjectName}</div>
                </div>
                <span class="activity-badge ${r.status}">${r.status === 'present' ? 'Present' : 'Absent'}</span>
            </div>`;
    }).join('');
}

function clearHistory() {
    if (!confirm('Clear all attendance records? This cannot be undone.')) return;
    app.data.records = [];
    saveData();
    updateStats();
    renderRecentActivity();
    renderHistory();
    showToast('History cleared', 'info');
}

// ---- SUBJECTS ----
function openSubjectModal() {
    document.getElementById('subjectModal')?.classList.add('active');
    setTimeout(() => document.getElementById('subjectName')?.focus(), 100);
}

function closeSubjectModal() {
    document.getElementById('subjectModal')?.classList.remove('active');
    document.getElementById('subjectName').value = '';
    document.getElementById('subjectCode').value = '';
    document.getElementById('subjectColor').value = '#22c55e';
}

function saveNewSubject() {
    const name  = document.getElementById('subjectName').value.trim();
    const code  = document.getElementById('subjectCode').value.trim();
    const color = document.getElementById('subjectColor').value;

    if (!name) {
        document.getElementById('subjectName').focus();
        showToast('Enter a subject name', 'info');
        return;
    }

    app.data.subjects.push({
        id: Date.now(),
        name,
        code: code || name,
        color,
        createdAt: new Date().toISOString()
    });

    saveData();
    renderSubjects();
    updateSubjectSelect();
    closeSubjectModal();
    showToast(`"${name}" added`, 'present');
}

function renderSubjects() {
    const el = document.getElementById('subjectsList');
    if (!el) return;

    if (app.data.subjects.length === 0) {
        el.innerHTML = '<p class="empty-msg">No subjects yet — add one to start tracking</p>';
        el.className = '';
        return;
    }

    el.className = 'subjects-grid';
    el.innerHTML = app.data.subjects.map(subject => {
        const records    = app.data.records.filter(r => r.subject === subject.id);
        const present    = records.filter(r => r.status === 'present').length;
        const total      = records.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        return `
            <div class="subject-card">
                <div class="subject-color-stripe" style="background:${subject.color}"></div>
                <button class="subject-delete" onclick="deleteSubject(${subject.id})" title="Delete">
                    <i class="fas fa-times"></i>
                </button>
                <div class="subject-name">${subject.name}</div>
                <div class="subject-code-tag">${subject.code}</div>
                <div class="subject-stats-row">
                    <div class="subject-stat">
                        <span class="subject-stat-val">${present}</span>
                        <span class="subject-stat-lbl">Present</span>
                    </div>
                    <div class="subject-stat">
                        <span class="subject-stat-val">${total}</span>
                        <span class="subject-stat-lbl">Total</span>
                    </div>
                    <div class="subject-stat">
                        <span class="subject-stat-val">${total > 0 ? percentage + '%' : '—'}</span>
                        <span class="subject-stat-lbl">Rate</span>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function deleteSubject(id) {
    const subject = app.data.subjects.find(s => s.id === id);
    if (!subject) return;
    if (!confirm(`Delete "${subject.name}"? Attendance records for this subject will remain but won't be linked.`)) return;
    app.data.subjects = app.data.subjects.filter(s => s.id !== id);
    saveData();
    renderSubjects();
    updateSubjectSelect();
    showToast(`"${subject.name}" deleted`, 'absent');
}

function updateSubjectSelect() {
    const sel = document.getElementById('subjectSelect');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Choose a subject...</option>' +
        app.data.subjects.map(s => `<option value="${s.id}">${s.name}${s.code !== s.name ? ` (${s.code})` : ''}</option>`).join('');
    sel.value = current;
}

// ---- ANALYTICS ----
function updateAnalytics() {
    const present    = app.data.records.filter(r => r.status === 'present').length;
    const absent     = app.data.records.filter(r => r.status === 'absent').length;
    const total      = app.data.records.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    // Donut — r=80, circumference = 2π×80 ≈ 502
    const circumference = 2 * Math.PI * 80;
    const offset = circumference - (percentage / 100) * circumference;
    const circle = document.getElementById('progressCircle');
    if (circle) {
        circle.style.strokeDashoffset = offset;
        // Color by rate
        circle.style.stroke = percentage >= 75 ? '#22c55e' : percentage >= 50 ? '#fbbf24' : '#f87171';
    }

    const textEl = document.getElementById('progressText');
    if (textEl) textEl.textContent = percentage + '%';

    document.getElementById('totalClasses').textContent    = total;
    document.getElementById('classesAttended').textContent = present;
    document.getElementById('classesMissed').textContent   = absent;

    // Subject breakdown
    const container = document.getElementById('subjectAnalytics');
    if (!container) return;

    if (app.data.subjects.length === 0) {
        container.innerHTML = '<p class="empty-msg">No subjects to analyze</p>';
        return;
    }

    container.innerHTML = app.data.subjects.map(subject => {
        const records    = app.data.records.filter(r => r.subject === subject.id);
        const present    = records.filter(r => r.status === 'present').length;
        const total      = records.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        const rateColor  = percentage >= 75 ? '#22c55e' : percentage >= 50 ? '#fbbf24' : '#f87171';
        const barWidth   = total > 0 ? percentage : 0;

        return `
            <div class="subject-analytics-item">
                <div class="sa-name" style="border-left: 3px solid ${subject.color}; padding-left: 12px;">
                    <strong>${subject.name}</strong>
                    <span>${subject.code}</span>
                </div>
                <div class="sa-right">
                    <span class="sa-classes">${present}/${total} classes</span>
                    <div class="sa-bar-wrap">
                        <div class="sa-bar" style="width:${barWidth}%; background:${rateColor}"></div>
                    </div>
                    <span class="sa-rate" style="color:${rateColor}">${total > 0 ? percentage + '%' : '—'}</span>
                </div>
            </div>`;
    }).join('');
}

// ---- DATA ----
function saveData() {
    localStorage.setItem(app.storageKey, JSON.stringify(app.data));
}

function loadData() {
    try {
        const saved = localStorage.getItem(app.storageKey);
        if (saved) app.data = JSON.parse(saved);
    } catch(e) {
        app.data = { records: [], subjects: [] };
    }
    updateSubjectSelect();
}

function downloadData() {
    const blob = new Blob([JSON.stringify(app.data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `studytrack-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported', 'info');
}

function clearAllData() {
    if (!confirm('Delete ALL data including all records and subjects?\n\nThis CANNOT be undone.')) return;
    if (!confirm('Last chance — are you absolutely sure?')) return;
    app.data = { records: [], subjects: [] };
    saveData();
    updateStats();
    renderRecentActivity();
    renderHistory();
    renderSubjects();
    updateSubjectSelect();
    showToast('All data cleared', 'absent');
}

// ---- ONLINE STATUS ----
function checkOnlineStatus() {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    if (navigator.onLine) {
        el.className = 'status-pill online';
        el.innerHTML = '<span class="status-dot"></span><span class="status-text">Online</span>';
    } else {
        el.className = 'status-pill';
        el.innerHTML = '<span class="status-dot"></span><span class="status-text">Offline</span>';
    }
}

// ---- TOAST ----
let toastTimer;
function showToast(msg, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = msg;
    el.className   = `toast ${type} show`;
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
