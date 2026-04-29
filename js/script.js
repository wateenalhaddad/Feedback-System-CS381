// ========== MOCK DATABASE (localStorage) ==========
let feedbacks = [];
let users = [];

function initMockData() {
  if (!localStorage.getItem('feedback_users')) {
    users = [
      { id: 1, name: "Student User", email: "student@university.edu", role: "student" },
      { id: 2, name: "Admin User", email: "admin@university.edu", role: "admin" }
    ];
    localStorage.setItem('feedback_users', JSON.stringify(users));
  } else {
    users = JSON.parse(localStorage.getItem('feedback_users'));
  }
  if (!localStorage.getItem('feedback_feedbacks')) {
    feedbacks = [
      { id: 101, studentId: 1, studentName: "Student User", title: "Library timings", content: "Extend library hours during exams.", status: "pending", date: "2026-04-20", category: "service" },
      { id: 102, studentId: 1, studentName: "Student User", title: "Course registration", content: "Portal was slow.", status: "reviewed", date: "2026-04-15", category: "course" },
      { id: 103, studentId: 1, studentName: "Student User", title: "Cafeteria food", content: "More healthy options.", status: "resolved", date: "2026-04-10", category: "facility" }
    ];
    localStorage.setItem('feedback_feedbacks', JSON.stringify(feedbacks));
  } else {
    feedbacks = JSON.parse(localStorage.getItem('feedback_feedbacks'));
  }
}
initMockData();

function saveFeedbacks() {
  localStorage.setItem('feedback_feedbacks', JSON.stringify(feedbacks));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('feedback_current_user'));
}
function setCurrentUser(user) {
  localStorage.setItem('feedback_current_user', JSON.stringify(user));
}
function logout() {
  localStorage.removeItem('feedback_current_user');
  window.location.href = 'login.html';
}
function requireAuth(roleRequired = null) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return false;
  }
  if (roleRequired && user.role !== roleRequired) {
    alert("Access denied: insufficient privileges.");
    window.location.href = (user.role === 'admin') ? 'admin.html' : 'dashboard.html';
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
    else if (valid) showToast("Submitted", 'success');
  });
}

function renderStudentDashboard() {
  const user = getCurrentUser();
  if (!user || user.role !== 'student') return;
  const myFeedbacks = feedbacks.filter(f => f.studentId === user.id);
  document.getElementById('totalCount') && (document.getElementById('totalCount').innerText = myFeedbacks.length);
  document.getElementById('pendingCount') && (document.getElementById('pendingCount').innerText = myFeedbacks.filter(f => f.status === 'pending').length);
  document.getElementById('reviewedCount') && (document.getElementById('reviewedCount').innerText = myFeedbacks.filter(f => f.status === 'reviewed' || f.status === 'resolved').length);
  const container = document.getElementById('studentFeedbackList');
  if (!container) return;
  if (myFeedbacks.length === 0) { container.innerHTML = '<p>No feedback yet. <a href="submit.html">Submit now →</a></p>'; return; }
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

function renderAdminTable(filterStatus = 'all') {
  const tbody = document.getElementById('adminFeedbackBody');
  if (!tbody) return;
  let filtered = [...feedbacks];
  if (filterStatus !== 'all') filtered = filtered.filter(f => f.status === filterStatus);
  if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No feedback found.<tr></tr>'; return; }
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
    sel.addEventListener('change', (e) => {
      const fid = parseInt(sel.dataset.id);
      const newStatus = sel.value;
      const fbIndex = feedbacks.findIndex(f => f.id === fid);
      if (fbIndex !== -1) {
        feedbacks[fbIndex].status = newStatus;
        saveFeedbacks();
        const filterVal = document.getElementById('statusFilter')?.value || 'all';
        renderAdminTable(filterVal);
        updateAdminStats();
        showToast(`Status changed to ${newStatus}`, 'success');
      }
    });
  });
  document.querySelectorAll('.delete-feedback').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const fid = parseInt(btn.dataset.id);
      showConfirm('Delete this feedback permanently?', () => {
        feedbacks = feedbacks.filter(f => f.id !== fid);
        saveFeedbacks();
        const filterVal = document.getElementById('statusFilter')?.value || 'all';
        renderAdminTable(filterVal);
        updateAdminStats();
        showToast('Deleted', 'danger');
      });
    });
  });
}

function updateAdminStats() {
  const total = feedbacks.length;
  const pending = feedbacks.filter(f => f.status === 'pending').length;
  const reviewed = feedbacks.filter(f => f.status === 'reviewed').length;
  document.getElementById('adminTotal') && (document.getElementById('adminTotal').innerText = total);
  document.getElementById('adminPending') && (document.getElementById('adminPending').innerText = pending);
  document.getElementById('adminReviewed') && (document.getElementById('adminReviewed').innerText = reviewed);
}

function setupSubmitForm() {
  const form = document.getElementById('feedbackForm');
  if (!form) return;
  initFormValidation('feedbackForm', () => {
    const user = getCurrentUser();
    if (!user) { showToast('Please login first', 'danger'); window.location.href='login.html'; return; }
    const title = document.getElementById('target').value.trim();
    const content = document.getElementById('message').value.trim();
    const category = document.getElementById('feedbackType').value;
    if (!title || !content || !category) return;
    const newId = Date.now();
    const newFeedback = {
      id: newId,
      studentId: user.id,
      studentName: user.name,
      title: title,
      content: content,
      status: 'pending',
      date: new Date().toISOString().slice(0,10),
      category: category
    };
    feedbacks.push(newFeedback);
    saveFeedbacks();
    showToast('Feedback submitted!', 'success');
    form.reset();
    const counter = form.querySelector('small');
    if (counter) counter.innerText = `0 / ${document.getElementById('message').maxLength}`;
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

document.addEventListener('DOMContentLoaded', () => {
  initHamburger();
  highlightActiveNav();
  initCharCounter();

  if (document.getElementById('loginForm')) {
    initFormValidation('loginForm', () => {
      const email = document.getElementById('email').value.trim();
      const pwd = document.getElementById('password').value;
      const user = users.find(u => u.email === email);
      if (!user) {
        showToast('User not found. Use student@university.edu or admin@university.edu', 'danger');
        return;
      }
      if (pwd.length < 1) {
        showToast('Password cannot be empty', 'danger');
        return;
      }
      setCurrentUser({ id: user.id, name: user.name, email: user.email, role: user.role });
      window.location.href = (user.role === 'admin') ? 'admin.html' : 'dashboard.html';
    });
  }

  if (document.getElementById('studentFeedbackList')) {
    if (!requireAuth('student')) return;
    renderStudentDashboard();
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  }

  if (document.getElementById('feedbackForm')) {
    if (!requireAuth('student')) return;
    setupSubmitForm();
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  }

  if (document.getElementById('adminFeedbackBody')) {
    if (!requireAuth('admin')) return;
    updateAdminStats();
    renderAdminTable('all');
    const filterSelect = document.getElementById('statusFilter');
    if (filterSelect) filterSelect.addEventListener('change', () => renderAdminTable(filterSelect.value));
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  }
});