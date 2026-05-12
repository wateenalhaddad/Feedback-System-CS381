const API_BASE = 'http://localhost/Feedback-System-CS381/api';


let currentUser = null;
let feedbacks = [];

async function api(endpoint, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(API_URL + endpoint, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

async function initApp() {
    try {
        currentUser = await api('me.php');
    } catch (e) {
        currentUser = null;
    }

    initHamburger();
    highlightActiveNav();
    initCharCounter();
    bindLogout();

    if (document.getElementById('loginForm')) {
        initFormValidation('loginForm', async () => {
            const email = document.getElementById('email').value.trim();
            const pwd = document.getElementById('password').value;
            try {
                const user = await api('login.php', 'POST', { email, password: pwd });
                currentUser = user;
                window.location.href = (user.role === 'admin') ? 'admin.html' : 'dashboard.html';
            } catch (e) {
                showToast(e.message, 'danger');
            }
        });
    }

    if (document.getElementById('registerForm')) {
        const confirmField = document.getElementById('regConfirm');
        const passwordField = document.getElementById('regPassword');

        const checkMatch = () => {
            if (confirmField.value && confirmField.value !== passwordField.value) {
                confirmField.classList.add('invalid');
                const errEl = confirmField.parentElement?.querySelector('.error-msg');
                if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.classList.add('show'); }
                return false;
            } else {
                confirmField.classList.remove('invalid');
                const errEl = confirmField.parentElement?.querySelector('.error-msg');
                if (errEl) errEl.classList.remove('show');
                return true;
            }
        };

        confirmField.addEventListener('blur', checkMatch);
        passwordField.addEventListener('input', () => { if (confirmField.value) checkMatch(); });

        initFormValidation('registerForm', async () => {
            if (!checkMatch()) return;

            const name     = document.getElementById('regName').value.trim();
            const email    = document.getElementById('regEmail').value.trim();
            const role     = document.getElementById('regRole').value;
            const password = document.getElementById('regPassword').value;

            try {
                const user = await api('register.php', 'POST', { name, email, password, role });
                currentUser = user;
                window.location.href = (user.role === 'admin') ? 'admin.html' : 'dashboard.html';
            } catch (e) {
                showToast(e.message, 'danger');
            }
        });
    }

    if (document.getElementById('studentFeedbackList')) {
        if (!requireAuth('student')) return;
        await renderStudentDashboard();
    }

    if (document.getElementById('feedbackForm')) {
        if (!requireAuth('student')) return;
        setupSubmitForm();
    }

    if (document.getElementById('adminFeedbackBody')) {
        if (!requireAuth('admin')) return;
        await updateAdminStats();
        await renderAdminTable('all');
        const filterSelect = document.getElementById('statusFilter');
        if (filterSelect) filterSelect.addEventListener('change', () => renderAdminTable(filterSelect.value));
    }
}

function bindLogout() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await api('logout.php', 'POST'); } catch (e) {}
        currentUser = null;
        window.location.href = 'login.html';
    });
}

function requireAuth(roleRequired = null) {
    if (!currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    if (roleRequired && currentUser.role !== roleRequired) {
        alert('Access denied: insufficient privileges.');
        window.location.href = (currentUser.role === 'admin') ? 'admin.html' : 'dashboard.html';
        return false;
    }
    return true;
}

function showToast(msg, type = '') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = type ? `show ${type}` : 'show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.className = '', 3000);
}

function showConfirm(message, onConfirm) {
    const overlay = document.getElementById('confirmOverlay');
    const msgEl = document.getElementById('confirmMsg');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');
    if (!overlay) return;

    msgEl.textContent = message;
    overlay.classList.add('show');

    const newYes = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    const newNo = noBtn.cloneNode(true);
    noBtn.parentNode.replaceChild(newNo, noBtn);

    newYes.addEventListener('click', () => {
        overlay.classList.remove('show');
        onConfirm();
    });
    newNo.addEventListener('click', () => overlay.classList.remove('show'));
}

function validateField(field) {
    const errEl = field.parentElement?.querySelector('.error-msg');
    let msg = '';
    if (field.required && !field.value.trim()) msg = 'This field is required.';
    else if (field.type === 'email' && field.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) msg = 'Invalid email.';
    else if (field.minLength && field.value.trim().length < field.minLength) msg = `Minimum ${field.minLength} characters.`;

    if (msg) {
        field.classList.add('invalid');
        if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
        return false;
    } else {
        field.classList.remove('invalid');
        if (errEl) errEl.classList.remove('show');
        return true;
    }
}

function initFormValidation(formId, callback) {
    const form = document.getElementById(formId);
    if (!form) return;
    const fields = form.querySelectorAll('input[required], select[required], textarea[required], input[type="email"]');
    fields.forEach(f => f.addEventListener('blur', () => validateField(f)));
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        let valid = true;
        fields.forEach(f => { if (!validateField(f)) valid = false; });
        if (valid && callback) callback(form);
    });
}

async function renderStudentDashboard() {
    const user = currentUser;
    if (!user || user.role !== 'student') return;

    try {
        feedbacks = await api('get_feedback.php');
    } catch (e) {
        showToast('Failed to load feedback', 'danger');
        return;
    }

    const myFeedbacks = feedbacks.filter(f => f.studentId === user.id);
    const totalEl = document.getElementById('totalCount');
    const pendingEl = document.getElementById('pendingCount');
    const reviewedEl = document.getElementById('reviewedCount');
    if (totalEl) totalEl.innerText = myFeedbacks.length;
    if (pendingEl) pendingEl.innerText = myFeedbacks.filter(f => f.status === 'pending').length;
    if (reviewedEl) reviewedEl.innerText = myFeedbacks.filter(f => f.status === 'reviewed' || f.status === 'resolved').length;

    const container = document.getElementById('studentFeedbackList');
    if (!container) return;
    if (myFeedbacks.length === 0) {
        container.innerHTML = '<p>No feedback yet. <a href="submit.html">Submit now →</a></p>';
        return;
    }
    container.innerHTML = myFeedbacks.map(fb => `
        <li class="feedback-item">
            <div>
                <div class="feedback-item-text">${escapeHtml(fb.title)} — ${escapeHtml(fb.content.substring(0, 80))}</div>
                <div class="feedback-item-type">${fb.category || 'general'} · ${fb.date}</div>
            </div>
            <span class="badge badge-${fb.status}">${fb.status}</span>
        </li>
    `).join('');
}

async function renderAdminTable(filterStatus = 'all') {
    const tbody = document.getElementById('adminFeedbackBody');
    if (!tbody) return;

    try {
        feedbacks = await api('get_feedback.php');
    } catch (e) {
        showToast('Failed to load feedback', 'danger');
        return;
    }

    let filtered = [...feedbacks];
    if (filterStatus !== 'all') filtered = filtered.filter(f => f.status === filterStatus);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No feedback found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(fb => `
        <tr data-fid="${fb.id}">
            <td data-label="Student">${escapeHtml(fb.studentName)}</td>
            <td data-label="Category">${escapeHtml(fb.category || 'general')}</td>
            <td data-label="Feedback">${escapeHtml(fb.title)} - ${escapeHtml(fb.content.substring(0, 50))}</td>
            <td data-label="Status"><span class="badge badge-${fb.status}">${fb.status}</span></td>
            <td data-label="Actions">
                <div class="action-btns">
                    <select class="status-select" data-id="${fb.id}" style="padding:0.3rem; border-radius:2rem;">
                        <option value="pending" ${fb.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="reviewed" ${fb.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
                        <option value="resolved" ${fb.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                    <button class="btn btn-danger btn-sm delete-feedback" data-id="${fb.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', async () => {
            const fid = parseInt(sel.dataset.id);
            const newStatus = sel.value;
            try {
                await api('update_status.php', 'POST', { id: fid, status: newStatus });
                showToast(`Status changed to ${newStatus}`, 'success');
                const filterVal = document.getElementById('statusFilter')?.value || 'all';
                await renderAdminTable(filterVal);
                await updateAdminStats();
            } catch (err) {
                showToast(err.message, 'danger');
            }
        });
    });

    document.querySelectorAll('.delete-feedback').forEach(btn => {
        btn.addEventListener('click', () => {
            const fid = parseInt(btn.dataset.id);
            showConfirm('Delete this feedback permanently?', async () => {
                try {
                    await api('delete_feedback.php', 'POST', { id: fid });
                    const filterVal = document.getElementById('statusFilter')?.value || 'all';
                    await renderAdminTable(filterVal);
                    await updateAdminStats();
                    showToast('Deleted', 'danger');
                } catch (err) {
                    showToast(err.message, 'danger');
                }
            });
        });
    });
}

async function updateAdminStats() {
    try {
        feedbacks = await api('get_feedback.php');
    } catch (e) { return; }

    const total = feedbacks.length;
    const pending = feedbacks.filter(f => f.status === 'pending').length;
    const reviewed = feedbacks.filter(f => f.status === 'reviewed').length;

    const tEl = document.getElementById('adminTotal');
    const pEl = document.getElementById('adminPending');
    const rEl = document.getElementById('adminReviewed');
    if (tEl) tEl.innerText = total;
    if (pEl) pEl.innerText = pending;
    if (rEl) rEl.innerText = reviewed;
}

function setupSubmitForm() {
    const form = document.getElementById('feedbackForm');
    if (!form) return;

    initFormValidation('feedbackForm', async () => {
        const user = currentUser;
        if (!user) { showToast('Please login first', 'danger'); window.location.href = 'login.html'; return; }

        const title = document.getElementById('target').value.trim();
        const content = document.getElementById('message').value.trim();
        const category = document.getElementById('feedbackType').value;
        if (!title || !content || !category) return;

        try {
            await api('submit_feedback.php', 'POST', { title, content, category });
            showToast('Feedback submitted!', 'success');
            form.reset();
            const counter = form.querySelector('small');
            if (counter) counter.innerText = `0 / ${document.getElementById('message').maxLength}`;
        } catch (e) {
            showToast(e.message, 'danger');
        }
    });
}

function initHamburger() {
    const btn = document.querySelector('.hamburger');
    const ul = document.querySelector('nav ul');
    if (btn && ul) btn.addEventListener('click', () => ul.classList.toggle('open'));
}

function highlightActiveNav() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav ul a').forEach(a => {
        if (a.getAttribute('href') === page) a.classList.add('active');
    });
}

function initCharCounter() {
    document.querySelectorAll('textarea[maxlength]').forEach(ta => {
        const max = parseInt(ta.maxLength);
        const counter = document.createElement('small');
        counter.style.cssText = 'color:var(--text-soft);float:right;font-size:0.7rem;margin-top:0.2rem;';
        counter.textContent = `0 / ${max}`;
        ta.parentElement.appendChild(counter);
        ta.addEventListener('input', () => counter.textContent = `${ta.value.length} / ${max}`);
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.addEventListener('DOMContentLoaded', initApp);