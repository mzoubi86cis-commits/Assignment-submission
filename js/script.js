/* ============================================================
   النظام الإلكتروني الموحد - سكريبت رئيسي
   ============================================================ */

const STORAGE_KEY = 'altorra_system_data';
const BTEC_STORAGE_KEY = 'btec_assignments';
const ACTIVITY_LOG_KEY = 'altorra_activity_log';

let selectedFiles = [];
let currentRole = 'student';
let isLoggedIn = false;
let qrCodeInstance = null;

/* ============================================================
   البيانات الأساسية
   ============================================================ */
function getData() {
    let data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
        const defaultData = getDefaultData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
        return defaultData;
    }
    return JSON.parse(data);
}

function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function getAssignments() { return getData().assignments || []; }
function saveAssignments(arr) { const d = getData(); d.assignments = arr; saveData(d); }
function getSubmissions() { return getData().submissions || []; }
function saveSubmissions(arr) { const d = getData(); d.submissions = arr; saveData(d); }

/* ============================================================
   سجل النشاطات
   ============================================================ */
function logActivity(action, details) {
    let log = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY) || '[]');
    log.push({ action, details, timestamp: new Date().toLocaleString('ar-EG') });
    if (log.length > 100) log = log.slice(-100);
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(log));
}

function getActivityLog() { return JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY) || '[]'); }

/* ============================================================
   نظام الصلاحيات
   ============================================================ */
function loginUser() {
    const role = document.getElementById('roleSelect').value;
    const password = document.getElementById('loginPassword').value.trim();
    if (password === PASSWORDS[role]) {
        isLoggedIn = true;
        currentRole = role;
        const roleNames = { student: 'طالب', evaluator: 'مقيّم', admin: 'مدير' };
        const status = document.getElementById('loginStatus');
        status.className = 'login-status logged-in';
        status.innerHTML = `<i class="fas fa-lock-open"></i> متصل كـ <strong>${roleNames[role]}</strong>`;
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginPassword').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline-flex';
        document.querySelector('.login-section .btn-gold').style.display = 'none';
        showToast(`✅ مرحباً بك كـ ${roleNames[role]}`, 'success');
        logActivity('تسجيل دخول', roleNames[role]);
        updateRoleVisibility();
        updateAll();
        updateAssignmentSelect();
    } else {
        showToast('❌ كلمة السر غير صحيحة!', 'error');
        document.getElementById('loginPassword').value = '';
    }
}

function logoutUser() {
    isLoggedIn = false;
    currentRole = 'student';
    const status = document.getElementById('loginStatus');
    status.className = 'login-status logged-out';
    status.innerHTML = '<i class="fas fa-lock"></i> غير متصل';
    document.getElementById('loginPassword').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'none';
    document.querySelector('.login-section .btn-gold').style.display = 'inline-flex';
    showToast('🔒 تم تسجيل الخروج', 'warning');
    logActivity('تسجيل خروج', '');
    updateRoleVisibility();
    updateAll();
}

function updateRoleVisibility() {
    const isStudent = isLoggedIn && currentRole === 'student';
    const isEvaluator = isLoggedIn && (currentRole === 'evaluator' || currentRole === 'admin');
    const isAdmin = isLoggedIn && currentRole === 'admin';

    document.querySelectorAll('.nav-tabs .tab-btn').forEach(btn => {
        const tab = btn.dataset.tab;
        let show = false;
        if (['student-dashboard', 'submit', 'student-search'].includes(tab)) show = isLoggedIn;
        else if (['evaluator-dashboard', 'submissions', 'add-assignment', 'btec-plan'].includes(tab)) show = isEvaluator;
        else if (tab === 'admin-dashboard') show = isAdmin;
        btn.classList.toggle('hidden', !show);
    });

    const firstVisible = document.querySelector('.nav-tabs .tab-btn:not(.hidden)');
    if (firstVisible) {
        document.querySelectorAll('.nav-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        firstVisible.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const target = document.getElementById('tab-' + firstVisible.dataset.tab);
        if (target) target.classList.add('active');
    }
}

/* ============================================================
   التبويبات الرئيسية
   ============================================================ */
document.querySelectorAll('.nav-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const target = document.getElementById('tab-' + this.dataset.tab);
        if (target) target.classList.add('active');
    });
});

/* ============================================================
   الواجبات
   ============================================================ */
function updateAssignmentSelect() {
    const assignments = getAssignments();
    const select = document.getElementById('submitAssignment');
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- اختر الواجب --</option>';
    assignments.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.name} (${a.specialization} - ${a.grade})`;
        opt.dataset.dueDate = a.dueDate;
        opt.dataset.specialization = a.specialization;
        opt.dataset.grade = a.grade;
        opt.dataset.description = a.description || '';
        select.appendChild(opt);
    });
    if (currentValue && [...select.options].some(o => o.value === currentValue)) select.value = currentValue;
}

document.getElementById('submitAssignment')?.addEventListener('change', function() {
    const selected = this.options[this.selectedIndex];
    const dueDateDisplay = document.getElementById('submitDueDateDisplay');
    const infoDisplay = document.getElementById('submitInfoDisplay');
    if (this.value && selected) {
        dueDateDisplay.value = `📅 ${selected.dataset.dueDate || 'غير محدد'}`;
        infoDisplay.value = `📚 ${selected.dataset.specialization} | 🎓 ${selected.dataset.grade}`;
        document.getElementById('assignmentHint').innerHTML = `✅ تاريخ التسليم: ${selected.dataset.dueDate}`;
        document.getElementById('assignmentHint').className = 'hint success';
    } else {
        dueDateDisplay.value = '';
        infoDisplay.value = '';
        document.getElementById('assignmentHint').innerHTML = '<i class="fas fa-calendar-days"></i> اختر الواجب لترى تاريخ التسليم';
        document.getElementById('assignmentHint').className = 'hint';
    }
});

/* ============================================================
   رفع الملفات
   ============================================================ */
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileName');
const fileList = document.getElementById('fileList');

uploadArea?.addEventListener('click', () => fileInput.click());
uploadArea?.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea?.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        handleFilesSelect(e.dataTransfer.files);
    }
});
fileInput?.addEventListener('change', function() { if (this.files.length > 0) handleFilesSelect(this.files); });

function handleFilesSelect(files) {
    selectedFiles = [];
    let validFiles = [];
    for (let file of files) {
        if (file.size > 10 * 1024 * 1024) {
            showToast(`⚠️ "${file.name}" كبير جداً`, 'error');
            continue;
        }
        validFiles.push(file);
    }
    selectedFiles = validFiles;
    updateFileList();
}

function updateFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, i) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `<i class="fas fa-file"></i> ${file.name} <span class="remove" onclick="removeFile(${i})">✕</span>`;
        fileList.appendChild(div);
    });
    if (selectedFiles.length > 0) {
        const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
        fileNameDisplay.textContent = `📎 ${selectedFiles.length} ملف (${(totalSize / 1024 / 1024).toFixed(2)} MB)`;
    } else {
        fileNameDisplay.textContent = 'لم يتم اختيار ملفات';
    }
}

function removeFile(i) { selectedFiles.splice(i, 1); updateFileList(); }

/* ============================================================
   حفظ الملفات محلياً
   ============================================================ */
function saveFileLocally(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileData = e.target.result;
        try {
            localStorage.setItem('file_' + file.name, fileData);
            callback(fileData);
        } catch (err) { saveToIndexedDB(file, callback); }
    };
    reader.readAsDataURL(file);
}

function saveToIndexedDB(file, callback) {
    const request = indexedDB.open('FileDB', 1);
    request.onupgradeneeded = function(e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'name' });
    };
    request.onsuccess = function(e) {
        const db = e.target.result;
        const tx = db.transaction(['files'], 'readwrite');
        const store = tx.objectStore('files');
        const reader = new FileReader();
        reader.onload = function(ev) {
            store.put({ name: file.name, data: ev.target.result });
            callback(ev.target.result);
        };
        reader.readAsDataURL(file);
    };
}

function getFileFromStorage(fileName, callback) {
    const data = localStorage.getItem('file_' + fileName);
    if (data) { callback(data); return; }
    const request = indexedDB.open('FileDB', 1);
    request.onsuccess = function(e) {
        const db = e.target.result;
        const tx = db.transaction(['files'], 'readonly');
        const store = tx.objectStore('files');
        const getReq = store.get(fileName);
        getReq.onsuccess = function() { callback(getReq.result ? getReq.result.data : null); };
    };
}

function downloadFile(fileName) {
    if (!fileName) return;
    const firstFile = fileName.split(',')[0].trim();
    getFileFromStorage(firstFile, function(data) {
        if (data) {
            const link = document.createElement('a');
            link.href = data;
            link.download = firstFile;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast(`📥 تحميل: ${firstFile}`, 'success');
        } else {
            showToast(`⚠️ الملف غير موجود`, 'error');
        }
    });
}

/* ============================================================
   تسليم الواجب
   ============================================================ */
document.getElementById('submitBtn')?.addEventListener('click', function() {
    if (!isLoggedIn) { showToast('⚠️ سجل الدخول أولاً', 'error'); return; }
    const studentId = document.getElementById('submitStudentId').value.trim();
    const studentName = document.getElementById('submitStudentName').value.trim();
    const assignmentId = parseInt(document.getElementById('submitAssignment').value);
    const evaluatorName = document.getElementById('submitEvaluatorSelect').value;
    if (!studentId || !studentName || !assignmentId || !evaluatorName || selectedFiles.length === 0) {
        showToast('⚠️ عبّئ جميع الحقول واختر ملفات', 'error'); return;
    }
    const assignments = getAssignments();
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) { showToast('⚠️ الواجب غير موجود', 'error'); return; }
    const submissions = getSubmissions();
    if (submissions.some(s => s.studentId === studentId && s.assignmentId === assignmentId)) {
        showToast(`⚠️ الواجب مسجل بالفعل`, 'error'); return;
    }
    const fileNames = [];
    let processed = 0;
    selectedFiles.forEach(file => {
        saveFileLocally(file, function() {
            fileNames.push(file.name);
            processed++;
            if (processed === selectedFiles.length) {
                const now = new Date();
                const newSub = {
                    id: Date.now(), studentId, studentName, evaluatorName,
                    assignmentId, fileName: fileNames.join(', '),
                    fileSize: (selectedFiles.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(2) + ' MB',
                    uploadDate: now.toLocaleString('ar-EG'),
                    status: 'pending', gradeValue: ''
                };
                submissions.push(newSub);
                saveSubmissions(submissions);
                showModal('✅ تم التسليم', `تم تسليم واجب "${assignment.name}"`, newSub, assignment);
                showToast(`✅ تم التسليم`, 'success');
                logActivity('تسليم واجب', studentName);
                selectedFiles = [];
                fileInput.value = '';
                fileList.innerHTML = '';
                fileNameDisplay.textContent = 'لم يتم اختيار ملفات';
                ['submitStudentId','submitStudentName','submitAssignment','submitDueDateDisplay','submitInfoDisplay','submitEvaluatorSelect'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                updateAll();
            }
        });
    });
});

/* ============================================================
   إضافة واجب
   ============================================================ */
document.getElementById('addAssignmentBtn')?.addEventListener('click', function() {
    if (!isLoggedIn || !['evaluator', 'admin'].includes(currentRole)) {
        showToast('⚠️ صلاحية محدودة', 'error'); return;
    }
    const name = document.getElementById('newAssignmentName').value.trim();
    const spec = document.getElementById('newAssignmentSpecialization').value;
    const grade = document.getElementById('newAssignmentGrade').value;
    const dueDate = document.getElementById('newAssignmentDueDate').value;
    const desc = document.getElementById('newAssignmentDescription').value.trim();
    if (!name || !spec || !grade || !dueDate) {
        showToast('⚠️ عبّئ الحقول المطلوبة', 'error'); return;
    }
    const assignments = getAssignments();
    assignments.push({ id: Date.now(), name, specialization: spec, grade, dueDate, description: desc });
    saveAssignments(assignments);
    updateAssignmentSelect();
    showToast(`✅ تم إضافة الواجب`, 'success');
    logActivity('إضافة واجب', name);
    ['newAssignmentName','newAssignmentSpecialization','newAssignmentGrade','newAssignmentDueDate','newAssignmentDescription'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    updateAll();
});

/* ============================================================
   وظائف المقيّم
   ============================================================ */
function toggleApproval(id) {
    if (!isLoggedIn || !['evaluator', 'admin'].includes(currentRole)) {
        showToast('⚠️ صلاحية محدودة', 'error'); return;
    }
    const subs = getSubmissions();
    const sub = subs.find(s => s.id === id);
    if (sub) {
        sub.status = sub.status === 'approved' ? 'pending' : 'approved';
        saveSubmissions(subs);
        showToast(sub.status === 'approved' ? `✅ تم التأكيد` : `⏳ تم الإلغاء`, 'success');
        logActivity('تغيير حالة', `${sub.studentName}: ${sub.status}`);
        updateAll();
    }
}

function addGrade(id) {
    if (!isLoggedIn || !['evaluator', 'admin'].includes(currentRole)) {
        showToast('⚠️ صلاحية محدودة', 'error'); return;
    }
    const subs = getSubmissions();
    const sub = subs.find(s => s.id === id);
    if (sub) {
        const msg = '⭐ اختر العلامة:\n\n1️⃣ D - ممتاز 🏆\n2️⃣ M - جيد جداً 👍\n3️⃣ P - مقبول ✅\n4️⃣ U - غير مقبول ❌\n\nالحالية: ' + (sub.gradeValue || 'لا توجد');
        const choice = prompt(msg, '');
        if (choice === null) return;
        const map = { '1': 'D', '2': 'M', '3': 'P', '4': 'U', 'd': 'D', 'm': 'M', 'p': 'P', 'u': 'U' };
        const grade = map[choice.trim().toLowerCase()];
        if (grade) {
            sub.gradeValue = grade;
            saveSubmissions(subs);
            showToast(`⭐ العلامة: ${grade}`, 'success');
            logActivity('إضافة علامة', `${sub.studentName}: ${grade}`);
            updateAll();
        } else showToast('❌ اختيار غير صحيح', 'error');
    }
}

function deleteSubmission(id) {
    if (!isLoggedIn || !['evaluator', 'admin'].includes(currentRole)) {
        showToast('⚠️ صلاحية محدودة', 'error'); return;
    }
    if (confirm('⚠️ حذف التسليم؟')) {
        let subs = getSubmissions();
        const sub = subs.find(s => s.id === id);
        subs = subs.filter(s => s.id !== id);
        saveSubmissions(subs);
        showToast(`🗑️ تم الحذف`, 'success');
        logActivity('حذف تسليم', sub?.studentName || '');
        updateAll();
    }
}

/* ============================================================
   بحث الطالب
   ============================================================ */
function searchStudent() {
    const query = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('searchResult');
    if (!query) {
        resultDiv.className = 'search-result waiting';
        resultDiv.innerHTML = '<i class="fas fa-circle-info"></i> أدخل رقمك أو اسمك';
        return;
    }
    const subs = getSubmissions();
    const assignments = getAssignments();
    const found = subs.filter(s => s.studentId === query || s.studentName.toLowerCase().includes(query.toLowerCase()));
    if (found.length === 0) {
        resultDiv.className = 'search-result not-found';
        resultDiv.innerHTML = '<i class="fas fa-circle-xmark"></i> ❌ لا توجد نتائج';
        return;
    }
    let html = `<div style="font-weight:800;margin-bottom:10px;"><i class="fas fa-circle-check" style="color:var(--success);"></i> تم العثور على ${found.length} واجب</div>`;
    found.forEach(s => {
        const a = assignments.find(x => x.id === s.assignmentId);
        const approved = s.status === 'approved';
        html += `<div style="border-bottom:1px solid #c3e6cb;padding:8px 0;text-align:right;font-size:0.88rem;">
            <strong>${s.studentName}</strong> (${s.studentId})<br>
            📚 ${a ? a.name : 'واجب'}<br>
            👨‍🏫 المقيّم: ${s.evaluatorName}<br>
            <span style="color:${approved ? 'var(--success)' : 'var(--warning)'};font-weight:700;">
                ${approved ? '✅ تم التأكيد' : '⏳ قيد المراجعة'}
            </span>
            ${s.gradeValue ? ` | <span style="color:var(--gold);font-weight:800;">⭐ ${s.gradeValue}</span>` : ''}
        </div>`;
    });
    resultDiv.className = 'search-result found';
    resultDiv.innerHTML = html;
}

/* ============================================================
   النوافذ المنبثقة
   ============================================================ */
function showModal(title, message, data, assignment) {
    document.getElementById('modalTitle').textContent = title;
    let details = '';
    if (data) {
        const labels = { studentId: 'رقم الطالب', studentName: 'اسم الطالب', evaluatorName: 'المقيّم', uploadDate: 'تاريخ التسليم' };
        for (let k in data) if (labels[k] && data[k]) {
            details += `<div class="row"><span class="label">${labels[k]}:</span><span class="value">${data[k]}</span></div>`;
        }
        if (assignment) {
            details += `<div class="row"><span class="label">الواجب:</span><span class="value">${assignment.name}</span></div>`;
            details += `<div class="row"><span class="label">تاريخ الاستحقاق:</span><span class="value">${assignment.dueDate}</span></div>`;
        }
    } else details = `<p>${message}</p>`;
    document.getElementById('modalDetails').innerHTML = details;
    document.getElementById('resultModal').classList.add('active');
}

function closeModal() { document.getElementById('resultModal').classList.remove('active'); }
document.getElementById('resultModal')?.addEventListener('click', function(e) { if (e.target === this) closeModal(); });

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toast.className = 'toast';
    if (type === 'error') toast.classList.add('error');
    if (type === 'warning') toast.classList.add('warning');
    toastMessage.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ============================================================
   تحديث الواجهات
   ============================================================ */
function updateAll() {
    updateStudentDashboard();
    updateEvaluatorDashboard();
    updateSubmissionsTable();
    updateAdminDashboard();
    updateEvaluatorFilter();
    updateHeaderStats();
}

function updateStudentDashboard() {
    const id = document.getElementById('studentId')?.value.trim() || '20241001';
    const subs = getSubmissions();
    const studentSubs = subs.filter(s => s.studentId === id);
    document.getElementById('sTotal').textContent = studentSubs.length;
    document.getElementById('sApproved').textContent = studentSubs.filter(s => s.status === 'approved').length;
    document.getElementById('sPending').textContent = studentSubs.filter(s => s.status === 'pending').length;
    document.getElementById('sOverdue').textContent = studentSubs.filter(s => {
        const a = getAssignments().find(x => x.id === s.assignmentId);
        return a && new Date(a.dueDate) < new Date() && s.status !== 'approved';
    }).length;
    const activities = document.getElementById('studentActivities');
    if (studentSubs.length === 0) {
        activities.innerHTML = '<p class="empty-text">لا توجد نشاطات</p>';
    } else {
        const assignments = getAssignments();
        activities.innerHTML = studentSubs.slice(-5).reverse().map(s => {
            const a = assignments.find(x => x.id === s.assignmentId);
            const icon = s.status === 'approved' ? '✅' : '⏳';
            return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:0.88rem;">
                <span>${icon} ${a ? a.name : 'واجب'}</span>
                <span style="color:var(--text-light);font-size:0.78rem;">${s.uploadDate}</span>
            </div>`;
        }).join('');
    }
}

document.getElementById('studentId')?.addEventListener('input', updateStudentDashboard);

function updateEvaluatorDashboard() {
    const subs = getSubmissions();
    document.getElementById('eTotal').textContent = subs.length;
    document.getElementById('eApproved').textContent = subs.filter(s => s.status === 'approved').length;
    document.getElementById('ePending').textContent = subs.filter(s => s.status === 'pending').length;
    document.getElementById('eOverdue').textContent = subs.filter(s => {
        const a = getAssignments().find(x => x.id === s.assignmentId);
        return a && new Date(a.dueDate) < new Date() && s.status !== 'approved';
    }).length;
}

function updateSubmissionsTable() {
    const subs = getSubmissions();
    const assignments = getAssignments();
    const tbody = document.getElementById('submissionsBody');
    const emptyMsg = document.getElementById('submissionsEmpty');
    const spec = document.getElementById('filterSpecialization').value;
    const grade = document.getElementById('filterGrade').value;
    const evalF = document.getElementById('filterEvaluator').value;
    let filtered = subs;
    if (spec !== 'all') filtered = filtered.filter(s => { const a = assignments.find(x => x.id === s.assignmentId); return a && a.specialization === spec; });
    if (grade !== 'all') filtered = filtered.filter(s => { const a = assignments.find(x => x.id === s.assignmentId); return a && a.grade === grade; });
    if (evalF !== 'all') filtered = filtered.filter(s => s.evaluatorName === evalF);
    document.getElementById('submissionsBadge').textContent = filtered.length;
    if (filtered.length === 0) { tbody.innerHTML = ''; emptyMsg.style.display = 'block'; return; }
    emptyMsg.style.display = 'none';
    const canEdit = isLoggedIn && ['evaluator', 'admin'].includes(currentRole);
    tbody.innerHTML = filtered.map((s, i) => {
        const a = assignments.find(x => x.id === s.assignmentId);
        const approved = s.status === 'approved';
        const overdue = a && new Date(a.dueDate) < new Date() && !approved;
        const statusClass = approved ? 'approved' : (overdue ? 'overdue' : 'pending');
        const statusText = approved ? 'مؤكد' : (overdue ? 'متأخر' : 'قيد المراجعة');
        const statusIcon = approved ? 'fa-circle-check' : (overdue ? 'fa-circle-exclamation' : 'fa-hourglass-half');
        let gradeDisplay = '<div class="grade-display empty">—</div>';
        if (s.gradeValue) gradeDisplay = `<div class="grade-display ${s.gradeValue}">${s.gradeValue}</div>`;
        return `<tr>
            <td>${i + 1}</td>
            <td>${s.studentId}</td>
            <td><strong>${s.studentName}</strong></td>
            <td>${s.evaluatorName}</td>
            <td style="font-size:0.8rem;">${a ? a.name : '—'}</td>
            <td style="font-size:0.7rem;">${s.fileName}</td>
            <td style="font-size:0.75rem;">${s.uploadDate}</td>
            <td><span class="status-badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${statusText}</span></td>
            <td>${gradeDisplay}</td>
            <td>
                ${canEdit ? `
                    <button class="action-btn ${approved ? 'approve-active' : 'approve'}" onclick="toggleApproval(${s.id})" title="${approved ? 'إلغاء' : 'تأكيد'}">
                        <i class="fas ${approved ? 'fa-circle-check' : 'fa-circle'}"></i>
                    </button>
                    <button class="action-btn grade" onclick="addGrade(${s.id})" title="علامة">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteSubmission(${s.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
                <button class="action-btn download" onclick="downloadFile('${s.fileName}')" title="تحميل">
                    <i class="fas fa-download"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function updateEvaluatorFilter() {
    const subs = getSubmissions();
    const evals = [...new Set(subs.map(s => s.evaluatorName).filter(Boolean))];
    const filter = document.getElementById('filterEvaluator');
    if (!filter) return;
    const current = filter.value;
    filter.innerHTML = '<option value="all">👨‍🏫 كل المقيّمين</option>';
    evals.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e; opt.textContent = e;
        filter.appendChild(opt);
    });
    if ([...filter.options].some(o => o.value === current)) filter.value = current;
}

document.getElementById('filterSpecialization')?.addEventListener('change', updateSubmissionsTable);
document.getElementById('filterGrade')?.addEventListener('change', updateSubmissionsTable);
document.getElementById('filterEvaluator')?.addEventListener('change', updateSubmissionsTable);
document.getElementById('refreshBtn')?.addEventListener('click', updateSubmissionsTable);

function updateAdminDashboard() {
    const subs = getSubmissions();
    document.getElementById('admTotalSub').textContent = subs.length;
    document.getElementById('admStudents').textContent = [...new Set(subs.map(s => s.studentId))].length;
    document.getElementById('admEvaluators').textContent = [...new Set(subs.map(s => s.evaluatorName).filter(Boolean))].length;
    document.getElementById('admApproved').textContent = subs.filter(s => s.status === 'approved').length;
    const tbody = document.getElementById('adminAssignmentsBody');
    if (tbody) {
        const assignments = getAssignments();
        tbody.innerHTML = assignments.map((a, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${a.name}</strong></td>
                <td>${a.specialization}</td>
                <td>${a.grade}</td>
                <td>${a.dueDate}</td>
                <td>
                    <button class="action-btn edit" onclick="editAssignment(${a.id})" title="تعديل"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete" onclick="deleteAssignment(${a.id})" title="حذف"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }
}

function updateHeaderStats() {
    const subs = getSubmissions();
    const assignments = getAssignments();
    document.getElementById('headerTotal').textContent = subs.length;
    document.getElementById('headerUpcoming').textContent = assignments.filter(a => {
        const diff = (new Date(a.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
    }).length;
    document.getElementById('headerEvaluated').textContent = subs.filter(s => s.status === 'approved').length;
}

/* ============================================================
   أدوات المدير
   ============================================================ */
function exportData(format) {
    if (!isLoggedIn || currentRole !== 'admin') return showToast('⚠️ صلاحية محدودة', 'error');
    const data = { assignments: getAssignments(), submissions: getSubmissions(), btec: BTEC_ASSIGNMENTS, log: getActivityLog() };
    if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `تقرير_${new Date().toLocaleDateString('ar-EG')}.json`);
    } else if (format === 'csv') {
        const rows = [['رقم الطالب', 'اسم الطالب', 'المقيّم', 'الواجب', 'الحالة', 'العلامة']];
        data.submissions.forEach(s => {
            const a = data.assignments.find(x => x.id === s.assignmentId);
            rows.push([s.studentId, s.studentName, s.evaluatorName, a ? a.name : '', s.status, s.gradeValue]);
        });
        const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `تقرير_${new Date().toLocaleDateString('ar-EG')}.csv`);
    }
    showToast('📊 تم التصدير', 'success');
    logActivity('تصدير بيانات', format);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click(); URL.revokeObjectURL(url);
}

function backupData() {
    if (!isLoggedIn || currentRole !== 'admin') return showToast('⚠️ صلاحية محدودة', 'error');
    exportData('json');
    showToast('☁️ تم النسخ الاحتياطي', 'success');
}

function showActivityLog() {
    if (!isLoggedIn || currentRole !== 'admin') return showToast('⚠️ صلاحية محدودة', 'error');
    const log = getActivityLog();
    let html = '';
    if (log.length === 0) html = '<p style="text-align:center;color:var(--text-light);">لا توجد نشاطات</p>';
    else {
        html = log.slice(-30).reverse().map(l => `
            <div style="padding:8px 0;border-bottom:1px solid #edf2f7;font-size:0.85rem;">
                <strong style="color:var(--primary-light);">${l.action}</strong>: ${l.details}
                <br><small style="color:var(--text-light);">${l.timestamp}</small>
            </div>
        `).join('');
    }
    document.getElementById('modalTitle').textContent = '📜 سجل النشاطات';
    document.getElementById('modalDetails').innerHTML = html;
    document.getElementById('resultModal').classList.add('active');
}

function showEvaluatorManager() {
    if (!isLoggedIn || currentRole !== 'admin') return showToast('⚠️ صلاحية محدودة', 'error');
    let html = '<div style="text-align:right;">';
    Object.keys(EVALUATORS).forEach(spec => {
        html += `<h4 style="color:var(--primary);margin:10px 0 6px;">${spec}</h4>`;
        EVALUATORS[spec].forEach(e => {
            html += `<div style="padding:5px 0;"><i class="fas fa-user-tie" style="color:var(--accent);"></i> ${e}</div>`;
        });
    });
    html += '</div>';
    document.getElementById('modalTitle').textContent = '👥 قائمة المقيّمين';
    document.getElementById('modalDetails').innerHTML = html;
    document.getElementById('resultModal').classList.add('active');
}

function editAssignment(id) {
    if (!isLoggedIn || currentRole !== 'admin') return showToast('⚠️ صلاحية محدودة', 'error');
    const a = getAssignments().find(x => x.id === id);
    if (!a) return;
    const newName = prompt('اسم الواجب:', a.name);
    if (newName === null) return;
    const newDate = prompt('تاريخ التسليم (YYYY-MM-DD):', a.dueDate);
    if (newDate === null) return;
    const assignments = getAssignments();
    const target = assignments.find(x => x.id === id);
    target.name = newName.trim();
    target.dueDate = newDate.trim();
    saveAssignments(assignments);
    showToast('✅ تم التعديل', 'success');
    logActivity('تعديل واجب', newName);
    updateAll();
}

function deleteAssignment(id) {
    if (!isLoggedIn || currentRole !== 'admin') return showToast('⚠️ صلاحية محدودة', 'error');
    if (!confirm('⚠️ حذف الواجب؟')) return;
    let assignments = getAssignments();
    const a = assignments.find(x => x.id === id);
    assignments = assignments.filter(x => x.id !== id);
    saveAssignments(assignments);
    updateAssignmentSelect();
    showToast('🗑️ تم الحذف', 'success');
    logActivity('حذف واجب', a?.name || '');
    updateAll();
}

function addDemoData() {
    if (!isLoggedIn || currentRole !== 'admin') return showToast('⚠️ صلاحية محدودة', 'error');
    const data = getData();
    data.submissions.push(
        { id: Date.now() + 1, studentId: '20241010', studentName: 'طالب تجريبي 1', evaluatorName: 'منذر الزعبي', assignmentId: data.assignments[0]?.id, fileName: 'واجب_تجريبي.pdf', fileSize: '1.5 MB', uploadDate: new Date().toLocaleString('ar-EG'), status: 'approved', gradeValue: 'D' },
        { id: Date.now() + 2, studentId: '20241011', studentName: 'طالب تجريبي 2', evaluatorName: 'فادي الحناوي', assignmentId: data.assignments[1]?.id, fileName: 'تقرير_تجريبي.docx', fileSize: '2.1 MB', uploadDate: new Date().toLocaleString('ar-EG'), status: 'pending', gradeValue: '' }
    );
    saveData(data);
    showToast('✅ تم إضافة بيانات تجريبية', 'success');
    logActivity('إضافة بيانات تجريبية', '');
    updateAll();
}

function resetAllData() {
    if (!isLoggedIn || currentRole !== 'admin') return showToast('⚠️ صلاحية محدودة', 'error');
    if (!confirm('⚠️ هل أنت متأكد؟ سيتم حذف كل البيانات!')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BTEC_STORAGE_KEY);
    localStorage.removeItem(ACTIVITY_LOG_KEY);
    location.reload();
}

/* ============================================================
   QR Code
   ============================================================ */
function generateQR() {
    const url = window.location.href;
    document.getElementById('siteUrl').textContent = url;
    const container = document.getElementById('qrcode');
    if (!container) return;
    container.innerHTML = '';
    qrCodeInstance = new QRCode(container, {
        text: url, width: 140, height: 140,
        colorDark: '#0f2b4a', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

function downloadQR() {
    const canvas = document.querySelector('#qrcode canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = 'QR_Code_مدرسة_الطرة.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}

function copyUrl() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => showToast('📋 تم النسخ', 'success'))
        .catch(() => {
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            showToast('📋 تم النسخ', 'success');
        });
}

/* ============================================================
   BTEC - الوظائف
   ============================================================ */
function switchBtecSpecialization(spec) {
    document.querySelectorAll('.btec-spec-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.spec === spec);
    });
    document.querySelectorAll('.btec-spec-content').forEach(c => c.classList.remove('active'));
    if (spec === 'it') {
        document.getElementById('btec-spec-it').classList.add('active');
        document.getElementById('btecSubtitle').textContent = 'الدبلوم الدولي في تكنولوجيا المعلومات - 2026/2027';
        BTEC_ASSIGNMENTS = BTEC_ASSIGNMENTS_IT;
        setTimeout(() => btecUpdateStats(), 100);
    } else if (spec === 'business') {
        document.getElementById('btec-spec-business').classList.add('active');
        document.getElementById('btecSubtitle').textContent = 'الدبلوم الدولي في إدارة الأعمال - 2026/2027';
        BTEC_ASSIGNMENTS = BTEC_ASSIGNMENTS_BUSINESS;
    }
    logActivity('تبديل تخصص BTEC', spec === 'it' ? 'تكنولوجيا المعلومات' : 'إدارة الأعمال');
}

/* ============================================================
   فتح ملف PDF في تبويب جديد (بدون فقدان تسجيل الدخول)
   ============================================================ */
function downloadPDF(pdfFile, unitName) {
    if (!pdfFile) {
        showToast('⚠️ لا يوجد ملف PDF متاح لهذه الوحدة', 'error');
        return;
    }

    // فتح الملف في تبويب/نافذة جديدة
    const newWindow = window.open(pdfFile, '_blank', 'noopener,noreferrer');
    
    if (newWindow) {
        // نجح فتح النافذة الجديدة
        newWindow.focus();
        showToast(`📥 جاري فتح: ${pdfFile}`, 'success');
        logActivity('فتح PDF', pdfFile);
    } else {
        // المتصفح منع فتح النافذة (Popup Blocker)
        showToast('⚠️ يرجى السماح بالنوافذ المنبثقة في المتصفح', 'warning');
        
        // محاولة بديلة: تحميل الملف مباشرة
        const link = document.createElement('a');
        link.href = pdfFile;
        link.target = '_blank';
        link.download = pdfFile;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}














function btecGetUnitHours(u) { return BTEC_UNIT_HOURS[u] || 7; }

function btecGetEvaluatorHours(name) {
    return BTEC_ASSIGNMENTS.filter(a => a.evaluator === name).reduce((s, a) => s + btecGetUnitHours(a.unit), 0);
}

function btecFormatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function btecIsUpcoming(d) {
    if (!d) return false;
    const diff = (new Date(d) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
}

function btecSave() {
    try {
        const data = BTEC_ASSIGNMENTS.map(a => ({ id: a.id, evaluator: a.evaluator, verifier: a.verifier }));
        localStorage.setItem(BTEC_STORAGE_KEY, JSON.stringify(data));
    } catch(e) {}
}

function btecLoad() {
    try {
        const saved = localStorage.getItem(BTEC_STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            data.forEach(item => {
                const a = BTEC_ASSIGNMENTS.find(x => x.id === item.id);
                if (a) { a.evaluator = item.evaluator || ''; a.verifier = item.verifier || ''; }
            });
        }
    } catch(e) {}
}

function btecRenderTable(containerId, data) {
    const tbody = document.getElementById(containerId);
    if (!tbody) return;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#6a7f9b;">لا توجد واجبات في هذا الفصل</td></tr>';
        return;
    }
    tbody.innerHTML = data.map((a, i) => {
        const upcoming = btecIsUpcoming(a.submission);
        const hours = btecGetUnitHours(a.unit);
        const info = BTEC_UNIT_DESCRIPTIONS[a.unit] || {};
        const hasPdf = !!info.pdfFile;
        const unitEsc = a.unit.replace(/'/g, "\\'");
        const taskEsc = a.task.replace(/'/g, "\\'");
        const learnEsc = (a.learning || '').replace(/'/g, "\\'").replace(/\n/g, '\\n');
        return `<tr>
            <td>${i + 1}</td>
            <td>
                <div class="btec-task-title">${a.task}</div>
                <div class="btec-unit-name">
                    <span>${a.unit}</span>
                    <button class="btec-info-btn" onclick="openBtecModal('${unitEsc}', '${taskEsc}', '${learnEsc}')" title="عرض وصف المادة">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    ${hasPdf ? `<button class="btec-pdf-btn" onclick="downloadPDF('${info.pdfFile}', '${unitEsc}')" title="تحميل ملف PDF"><i class="fas fa-file-pdf"></i></button>` : ''}
                </div>
            </td>
            <td style="font-size:12px;color:#2d4057;max-width:200px;">${(a.learning || '').replace(/\n/g, '<br>')}</td>
            <td class="btec-hours-cell">${hours}</td>
            <td class="btec-date-cell"><i class="fas fa-calendar-alt"></i> ${btecFormatDate(a.distribution)}</td>
            <td class="btec-date-cell">
                <i class="fas fa-calendar-check"></i> ${btecFormatDate(a.submission)}
                ${upcoming ? ' <span class="btec-alert-badge"><span class="pulse"></span> قريب</span>' : ''}
            </td>
            <td class="btec-date-cell"><i class="fas fa-check-double"></i> ${btecFormatDate(a.teacherDecision)}</td>
            <td>
                <select class="btec-select-sm" onchange="btecSetEvaluator(${a.id}, this.value)">
                    <option value="">-- اختر --</option>
                    ${BTEC_EVALUATORS_LIST.map(e => `<option value="${e.name}" ${a.evaluator === e.name ? 'selected' : ''}>${e.name}</option>`).join('')}
                </select>
            </td>
            <td>
                <select class="btec-select-sm" onchange="btecSetVerifier(${a.id}, this.value)">
                    <option value="">-- اختر --</option>
                    ${BTEC_EVALUATORS_LIST.map(e => `<option value="${e.name}" ${a.verifier === e.name ? 'selected' : ''}>${e.name}</option>`).join('')}
                </select>
            </td>
        </tr>`;
    }).join('');
}

function btecSetEvaluator(id, val) {
    const a = BTEC_ASSIGNMENTS.find(x => x.id === id);
    if (a) { a.evaluator = val; btecSave(); btecUpdateStats(); }
}

function btecSetVerifier(id, val) {
    const a = BTEC_ASSIGNMENTS.find(x => x.id === id);
    if (a) { a.verifier = val; btecSave(); btecUpdateStats(); }
}

function openBtecModal(unitName, taskName, learning) {
    const modal = document.getElementById('btecUnitModal');
    document.getElementById('btecModalTitle').textContent = unitName;
    const info = BTEC_UNIT_DESCRIPTIONS[unitName] || {
        description: 'لا يوجد وصف تفصيلي لهذه الوحدة',
        objectives: 'لم يتم تحديد الأهداف بعد',
        learningOutcomes: '—',
        pdfFile: null
    };
    const hours = btecGetUnitHours(unitName);
    const assignment = BTEC_ASSIGNMENTS.find(a => a.unit === unitName && a.task === taskName);

    let levelText = '';
    if (assignment) {
        if (assignment.level === 'Level 2') levelText = 'المستوى الثاني (الصف العاشر)';
        else if (assignment.year === 11) levelText = 'المستوى الثالث (الصف الحادي عشر)';
        else if (assignment.year === 12) levelText = 'المستوى الثالث (الصف الثاني عشر)';
    }

    document.getElementById('btecModalBody').innerHTML = `
        <div class="btec-unit-code"><i class="fas fa-tag"></i> ${hours} ساعة تدريس</div>
        <div class="btec-unit-title">${unitName}</div>
        <div class="btec-unit-task"><i class="fas fa-tasks"></i> المهمة: ${taskName}</div>
        <div style="margin-bottom:12px;font-size:14px;color:#4a5a72;">
            <i class="fas fa-layer-group"></i> ${levelText}
        </div>
        <div class="btec-description">
            <p><strong>📖 وصف المادة:</strong></p>
            <p>${info.description}</p>
        </div>
        <div style="margin-bottom:16px;">
            <p><strong>🎯 أهداف التعلم العامة:</strong></p>
            <p style="color:#1e2b3f;font-size:14px;line-height:1.8;white-space:pre-line;">${info.objectives}</p>
        </div>
        <div style="margin-bottom:16px;background:#f0f4f8;border-radius:12px;padding:16px;">
            <p><strong><i class="fas fa-bullseye" style="color:#1a4b6d;"></i> أهداف التعلم التفصيلية:</strong></p>
            <p style="color:#1e2b3f;font-size:14px;line-height:1.8;white-space:pre-line;margin-top:8px;">${info.learningOutcomes || learning}</p>
        </div>
        <div style="margin-bottom:16px;background:#fef9e7;border-radius:12px;padding:16px;border-right:4px solid #f39c12;">
            <p><strong><i class="fas fa-lightbulb" style="color:#f39c12;"></i> أهداف التعلم حسب المهمة:</strong></p>
            <p style="color:#1e2b3f;font-size:14px;line-height:1.8;white-space:pre-line;margin-top:8px;">${learning}</p>
        </div>
        <div class="btec-unit-details">
            <div class="btec-detail-item">
                <span class="label"><i class="far fa-calendar-alt"></i> تاريخ التوزيع</span>
                <span class="value">${btecFormatDate(assignment?.distribution)}</span>
            </div>
            <div class="btec-detail-item">
                <span class="label"><i class="far fa-calendar-check"></i> تاريخ الاستلام</span>
                <span class="value">${btecFormatDate(assignment?.submission)}</span>
            </div>
            <div class="btec-detail-item">
                <span class="label"><i class="fas fa-clock"></i> عدد الساعات</span>
                <span class="value">${hours} ساعة</span>
            </div>
            <div class="btec-detail-item">
                <span class="label"><i class="fas fa-layer-group"></i> المستوى</span>
                <span class="value">${levelText}</span>
            </div>
        </div>
        ${info.pdfFile ? `
            <button class="btec-pdf-download" onclick="downloadPDF('${info.pdfFile}', '${unitName.replace(/'/g, "\\'")}')">
                <i class="fas fa-file-pdf"></i> تحميل ملف PDF لوصف الوحدة
            </button>
        ` : ''}
    `;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeBtecModal() {
    document.getElementById('btecUnitModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

document.getElementById('btecUnitModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeBtecModal();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeBtecModal();
});

function btecRenderEvaluators() {
    const grid = document.getElementById('btecEvaluatorGrid');
    if (!grid) return;
    const total = BTEC_ASSIGNMENTS.length;
    grid.innerHTML = BTEC_EVALUATORS_LIST.map(e => {
        const count = BTEC_ASSIGNMENTS.filter(a => a.evaluator === e.name).length;
        const hours = btecGetEvaluatorHours(e.name);
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `<div class="btec-eval-card">
            <div class="btec-avatar">${e.name.charAt(0)}</div>
            <h4>${e.name}</h4>
            <div class="btec-role">${e.role}</div>
            <div class="btec-info-row"><span class="label"><i class="fas fa-clock"></i> إجمالي الساعات</span><span class="value">${hours} ساعة</span></div>
            <div class="btec-info-row"><span class="label"><i class="fas fa-tasks"></i> الواجبات</span><span class="value">${count}</span></div>
            <div class="btec-info-row"><span class="label"><i class="fas fa-percent"></i> النسبة</span><span class="value">${pct}%</span></div>
            <div class="btec-progress-bar"><div class="fill" style="width:${pct}%;"></div></div>
        </div>`;
    }).join('');
}

function btecRenderReports() {
    const grid = document.getElementById('btecReportsGrid');
    if (!grid) return;
    const levels = [
        { label: 'المستوى الثاني (الصف العاشر)', filter: 'Level 2', year: null },
        { label: 'المستوى الثالث (الصف الحادي عشر)', filter: 'Level 3', year: 11 },
        { label: 'المستوى الثالث (الصف الثاني عشر)', filter: 'Level 3', year: 12 }
    ];
    const levelData = levels.map(l => {
        const items = BTEC_ASSIGNMENTS.filter(a => {
            if (l.filter === 'Level 2') return a.level === 'Level 2';
            return a.level === 'Level 3' && a.year === l.year;
        });
        const evaluated = items.filter(a => a.evaluator && a.evaluator.length > 0).length;
        const upcoming = items.filter(a => btecIsUpcoming(a.submission)).length;
        const totalHours = items.reduce((sum, a) => sum + btecGetUnitHours(a.unit), 0);
        return { label: l.label, total: items.length, evaluated, upcoming, totalHours };
    });
    const evaluatorStats = BTEC_EVALUATORS_LIST.map(e => {
        const count = BTEC_ASSIGNMENTS.filter(a => a.evaluator === e.name).length;
        const hours = btecGetEvaluatorHours(e.name);
        return { ...e, count, hours };
    });
    const cards = [
        ...levelData.map(d => `
            <div class="btec-report-card">
                <div class="btec-report-title"><i class="fas fa-layer-group"></i> ${d.label}</div>
                <div class="btec-highlight">${d.total}</div>
                <div class="btec-stat-row"><span class="label">إجمالي الساعات</span><span class="value">${d.totalHours} ساعة</span></div>
                <div class="btec-stat-row"><span class="label">مُقيَّمة</span><span class="value">${d.evaluated}</span></div>
                <div class="btec-stat-row"><span class="label">قريبة</span><span class="value">${d.upcoming}</span></div>
                <div class="btec-stat-row"><span class="label">نسبة التقييم</span><span class="value">${d.total > 0 ? Math.round((d.evaluated/d.total)*100) : 0}%</span></div>
            </div>
        `),
        ...evaluatorStats.map(e => `
            <div class="btec-report-card">
                <div class="btec-report-title"><i class="fas fa-user-tie"></i> ${e.name}</div>
                <div class="btec-highlight">${e.count}</div>
                <div class="btec-stat-row"><span class="label">الساعات</span><span class="value">${e.hours} ساعة</span></div>
                <div class="btec-stat-row"><span class="label">الدور</span><span class="value">${e.role}</span></div>
            </div>
        `)
    ];
    grid.innerHTML = cards.join('');
}

function btecUpdateStats() {
    if (document.getElementById('btec-spec-business')?.classList.contains('active')) return;
    const total = BTEC_ASSIGNMENTS.length;
    const evaluated = BTEC_ASSIGNMENTS.filter(a => a.evaluator && a.evaluator.length > 0).length;
    const upcoming = BTEC_ASSIGNMENTS.filter(a => btecIsUpcoming(a.submission)).length;
    const btecTotalEl = document.getElementById('btecTotal');
    const btecUpcomingEl = document.getElementById('btecUpcoming');
    const btecEvaluatedEl = document.getElementById('btecEvaluated');
    if (btecTotalEl) btecTotalEl.textContent = total;
    if (btecUpcomingEl) btecUpcomingEl.textContent = upcoming;
    if (btecEvaluatedEl) btecEvaluatedEl.textContent = evaluated;
    const level2 = BTEC_ASSIGNMENTS.filter(a => a.level === 'Level 2');
    const level3_11 = BTEC_ASSIGNMENTS.filter(a => a.level === 'Level 3' && a.year === 11);
    const level3_12 = BTEC_ASSIGNMENTS.filter(a => a.level === 'Level 3' && a.year === 12);
    const b2 = document.getElementById('btecBadgeLevel2');
    const b311 = document.getElementById('btecBadgeLevel3_11');
    const b312 = document.getElementById('btecBadgeLevel3_12');
    const bEval = document.getElementById('btecBadgeEvaluators');
    if (b2) b2.textContent = level2.length;
    if (b311) b311.textContent = level3_11.length;
    if (b312) b312.textContent = level3_12.length;
    if (bEval) bEval.textContent = BTEC_EVALUATORS_LIST.length;
    btecRenderTable('btecL2S1', level2.filter(a => a.semester === 'الفصل الأول'));
    btecRenderTable('btecL2S2', level2.filter(a => a.semester === 'الفصل الثاني'));
    btecRenderTable('btecL2S3', level2.filter(a => a.semester === 'الفصل الثالث'));
    btecRenderTable('btecL311S1', level3_11.filter(a => a.semester === 'الفصل الأول'));
    btecRenderTable('btecL311S2', level3_11.filter(a => a.semester === 'الفصل الثاني'));
    btecRenderTable('btecL311S3', level3_11.filter(a => a.semester === 'الفصل الثالث'));
    btecRenderTable('btecL312S1', level3_12.filter(a => a.semester === 'الفصل الأول'));
    btecRenderTable('btecL312S2', level3_12.filter(a => a.semester === 'الفصل الثاني'));
    btecRenderTable('btecL312S3', level3_12.filter(a => a.semester === 'الفصل الثالث'));
    btecRenderEvaluators();
    btecRenderReports();
}

document.querySelectorAll('#tab-btec-plan .btec-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('#tab-btec-plan .btec-tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('#tab-btec-plan .btec-tab-content').forEach(c => c.classList.remove('active'));
        const content = document.querySelector(`#tab-btec-plan .btec-tab-content[data-btec-content="${this.dataset.btecTab}"]`);
        if (content) content.classList.add('active');
    });
});

function printCurrentBtecTab() { window.print(); }

function printAllBtecTabs() {
    document.querySelectorAll('#tab-btec-plan .btec-tab-content').forEach(c => c.classList.add('active'));
    window.print();
    setTimeout(() => {
        document.querySelectorAll('#tab-btec-plan .btec-tab-content').forEach(c => c.classList.remove('active'));
        const ac = document.querySelector('#tab-btec-plan .btec-tab-content[data-btec-content="level2"]');
        if (ac) ac.classList.add('active');
    }, 500);
}

/* ============================================================
   التهيئة
   ============================================================ */
function init() {
    const today = new Date();
    const defaultDue = new Date(today);
    defaultDue.setDate(today.getDate() + 7);
    const newDueDate = document.getElementById('newAssignmentDueDate');
    if (newDueDate) newDueDate.value = defaultDue.toISOString().split('T')[0];

    if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(getDefaultData()));
    }

    btecLoad();
    updateAssignmentSelect();
    updateAll();
    btecUpdateStats();

    setTimeout(generateQR, 500);
    setTimeout(() => showToast('👋 مرحباً بك', 'success'), 800);

    console.log('✅ النظام جاهز!');
    console.log('🔑 الطالب: 123 | المقيّم: teacher123 | المدير: admin123');
}

document.addEventListener('DOMContentLoaded', init);