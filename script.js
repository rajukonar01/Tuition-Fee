const STUDENTS_KEY = 'tuition_students';
const PAYMENTS_KEY = 'tuition_payments';

let students = [];
let payments = {};
let currentEditingStudentId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeUI();
    updateDashboard();
    renderStudents();
    setupEventListeners();
});

function initializeUI() {
    updateTodayDate();
    const joiningDateInput = document.getElementById('joiningDate');
    joiningDateInput.valueAsDate = new Date();
}

function updateTodayDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('todayDate').textContent = today.toLocaleDateString('en-US', options);
}

function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    document.getElementById('studentForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    document.querySelectorAll('input[name="paymentDateOption"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const customContainer = document.getElementById('customDateContainer');
            customContainer.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
    });

    document.getElementById('confirmPaymentBtn').addEventListener('click', confirmPayment);
    document.getElementById('closePaymentModalBtn').addEventListener('click', closePaymentModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    document.getElementById('closeDeleteModalBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('closeHistoryModalBtn').addEventListener('click', closeHistoryModal);
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    if (tabName === 'students') {
        renderStudents();
    } else if (tabName === 'add') {
        resetForm();
    }
}

function handleFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('studentName').value.trim();
    const phone = document.getElementById('phoneNumber').value.trim();
    const fee = parseFloat(document.getElementById('monthlyFee').value);
    const joiningDate = document.getElementById('joiningDate').value;

    if (!name || !phone || !fee || !joiningDate) {
        alert('Please fill all fields');
        return;
    }

    if (currentEditingStudentId) {
        updateStudent(currentEditingStudentId, name, phone, fee, joiningDate);
    } else {
        addStudent(name, phone, fee, joiningDate);
    }

    resetForm();
    switchTab('students');
}

function resetForm() {
    document.getElementById('studentForm').reset();
    currentEditingStudentId = null;
    document.getElementById('formTitle').textContent = 'Add New Student';
    document.getElementById('cancelBtn').style.display = 'none';
    const joiningDateInput = document.getElementById('joiningDate');
    joiningDateInput.valueAsDate = new Date();
}

function cancelEdit() {
    resetForm();
    switchTab('students');
}

function addStudent(name, phone, fee, joiningDate) {
    const id = Date.now().toString();
    const student = { id, name, phone, fee, joiningDate };
    students.push(student);
    payments[id] = [];
    saveData();
    updateDashboard();
    alert(`Student "${name}" added successfully`);
}

function updateStudent(id, name, phone, fee, joiningDate) {
    const student = students.find(s => s.id === id);
    if (student) {
        student.name = name;
        student.phone = phone;
        student.fee = fee;
        student.joiningDate = joiningDate;
        saveData();
        updateDashboard();
        alert(`Student "${name}" updated successfully`);
    }
}

function deleteStudent(id) {
    const index = students.findIndex(s => s.id === id);
    if (index > -1) {
        const name = students[index].name;
        students.splice(index, 1);
        delete payments[id];
        saveData();
        updateDashboard();
        renderStudents();
        alert(`Student "${name}" deleted successfully`);
    }
}

function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (student) {
        currentEditingStudentId = id;
        document.getElementById('studentName').value = student.name;
        document.getElementById('phoneNumber').value = student.phone;
        document.getElementById('monthlyFee').value = student.fee;
        document.getElementById('joiningDate').value = student.joiningDate;
        document.getElementById('formTitle').textContent = 'Edit Student';
        document.getElementById('cancelBtn').style.display = 'inline-block';
        switchTab('add');
    }
}

function renderStudents(searchTerm = '') {
    const studentsList = document.getElementById('studentsList');
    const noStudents = document.getElementById('noStudents');

    let filteredStudents = students;
    if (searchTerm) {
        filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filteredStudents.length === 0) {
        studentsList.innerHTML = '';
        noStudents.style.display = 'block';
        return;
    }

    noStudents.style.display = 'none';
    studentsList.innerHTML = filteredStudents.map(student => createStudentCard(student)).join('');

    document.querySelectorAll('.btn-pay').forEach(btn => {
        btn.addEventListener('click', (e) => openPaymentModal(e.target.dataset.id));
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => editStudent(e.target.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => openDeleteModal(e.target.dataset.id));
    });

    document.querySelectorAll('.btn-history').forEach(btn => {
        btn.addEventListener('click', (e) => openPaymentHistoryModal(e.target.dataset.id));
    });
}

function createStudentCard(student) {
    const { id, name, phone, fee, joiningDate } = student;
    const status = getPaymentStatus(id);
    const currentDue = getCurrentDueDate(joiningDate);
    const lastPayment = getLastPaymentDate(id);
    const overdueDays = calculateOverdueDays(currentDue);

    let cardClass = 'student-card';
    let statusClass = 'status-badge';
    let statusText = '';

    if (status === 'paid') {
        cardClass += ' paid';
        statusClass += ' paid';
        statusText = 'Paid';
    } else if (overdueDays > 0) {
        cardClass += ' overdue';
        statusClass += ' overdue';
        statusText = 'Overdue';
    } else {
        statusClass += ' unpaid';
        statusText = 'Unpaid';
    }

    const dueDateObj = new Date(currentDue);
    const formattedDueDate = dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedJoiningDate = new Date(joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedLastPayment = lastPayment ? new Date(lastPayment).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

    let overdueHTML = '';
    if (overdueDays > 0) {
        overdueHTML = `<div class="overdue-days">Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}</div>`;
    }

    return `
        <div class="${cardClass}">
            <div class="student-header">
                <div class="student-name">${escapeHtml(name)}</div>
                <span class="${statusClass}">${statusText}</span>
            </div>
            <div class="student-info">
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${escapeHtml(phone)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Monthly Fee:</span>
                    <span class="info-value">Rs. ${fee.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Joining Date:</span>
                    <span class="info-value">${formattedJoiningDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Current Due:</span>
                    <span class="info-value">${formattedDueDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Last Payment:</span>
                    <span class="info-value">${formattedLastPayment}</span>
                </div>
            </div>
            ${overdueHTML}
            <div class="student-actions">
                <button class="btn btn-success btn-pay" data-id="${id}">Mark Paid</button>
                <button class="btn btn-primary btn-history btn-small" data-id="${id}">History</button>
                <button class="btn btn-primary btn-edit btn-small" data-id="${id}">Edit</button>
                <button class="btn btn-danger btn-delete btn-small" data-id="${id}">Delete</button>
            </div>
        </div>
    `;
}

function handleSearch(e) {
    renderStudents(e.target.value);
}

let currentPaymentStudentId = null;

function openPaymentModal(studentId) {
    currentPaymentStudentId = studentId;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const currentDue = getCurrentDueDate(student.joiningDate);
    const dueDateObj = new Date(currentDue);
    const formattedDueDate = dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    document.getElementById('paymentStudentName').textContent = escapeHtml(student.name);
    document.getElementById('paymentAmount').textContent = student.fee.toFixed(2);
    document.getElementById('paymentDueDate').textContent = formattedDueDate;

    document.querySelectorAll('input[name="paymentDateOption"]').forEach(radio => {
        if (radio.value === 'today') radio.checked = true;
    });
    document.getElementById('customDateContainer').style.display = 'none';
    document.getElementById('customPaymentDate').value = '';

    document.getElementById('paymentModal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    currentPaymentStudentId = null;
}

function confirmPayment() {
    if (!currentPaymentStudentId) return;

    const paymentOption = document.querySelector('input[name="paymentDateOption"]:checked').value;
    let paymentDate;

    if (paymentOption === 'today') {
        paymentDate = new Date().toISOString().split('T')[0];
    } else {
        paymentDate = document.getElementById('customPaymentDate').value;
        if (!paymentDate) {
            alert('Please select a payment date');
            return;
        }
    }

    recordPayment(currentPaymentStudentId, paymentDate);
    closePaymentModal();
    updateDashboard();
    renderStudents();
}

function recordPayment(studentId, paymentDate) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const currentDue = getCurrentDueDate(student.joiningDate);
    const paymentMonth = paymentDate.substring(0, 7);
    const dueMonth = currentDue.substring(0, 7);

    if (payments[studentId]) {
        const existingPayment = payments[studentId].find(p => p.month === dueMonth);
        if (existingPayment) {
            if (confirm(`Payment already recorded for ${dueMonth}. Do you want to update it?`)) {
                existingPayment.date = paymentDate;
            } else {
                return;
            }
        } else {
            payments[studentId].push({
                month: dueMonth,
                date: paymentDate,
                amount: student.fee
            });
        }
    } else {
        payments[studentId] = [{
            month: dueMonth,
            date: paymentDate,
            amount: student.fee
        }];
    }

    saveData();
    alert(`Payment recorded for ${student.name}`);
}

function getLastPaymentDate(studentId) {
    if (!payments[studentId] || payments[studentId].length === 0) return null;
    const sorted = payments[studentId].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted[0].date;
}

function getPaymentStatus(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return 'unpaid';

    const currentDue = getCurrentDueDate(student.joiningDate);
    const dueMonth = currentDue.substring(0, 7);

    if (payments[studentId]) {
        const payment = payments[studentId].find(p => p.month === dueMonth);
        if (payment) {
            const paymentDate = new Date(payment.date);
            const today = new Date();
            if (paymentDate <= today) return 'paid';
        }
    }

    return 'unpaid';
}

function getCurrentDueDate(joiningDateStr) {
    const joiningDate = new Date(joiningDateStr);
    const joiningDay = joiningDate.getDate();

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let dueDate = new Date(currentYear, currentMonth, joiningDay);

    if (dueDate < today) {
        dueDate = new Date(currentYear, currentMonth + 1, joiningDay);
    }

    return dueDate.toISOString().split('T')[0];
}

function calculateOverdueDays(dueDateStr) {
    const dueDate = new Date(dueDateStr);
    const today = new Date();

    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (today <= dueDate) return 0;

    const timeDifference = today.getTime() - dueDate.getTime();
    const overdueDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    return overdueDays;
}

function updateDashboard() {
    let totalStudents = students.length;
    let paidStudents = 0;
    let unpaidStudents = 0;
    let overdueStudents = 0;

    students.forEach(student => {
        const currentDue = getCurrentDueDate(student.joiningDate);
        const overdueDays = calculateOverdueDays(currentDue);

        if (overdueDays > 0) {
            overdueStudents++;
        }

        const status = getPaymentStatus(student.id);
        if (status === 'paid') {
            paidStudents++;
        } else {
            unpaidStudents++;
        }
    });

    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('paidStudents').textContent = paidStudents;
    document.getElementById('unpaidStudents').textContent = unpaidStudents;
    document.getElementById('overdueStudents').textContent = overdueStudents;
}

let currentDeleteStudentId = null;

function openDeleteModal(studentId) {
    currentDeleteStudentId = studentId;
    const student = students.find(s => s.id === studentId);
    if (student) {
        document.getElementById('deleteStudentName').textContent = escapeHtml(student.name);
        document.getElementById('deleteModal').classList.add('active');
    }
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentDeleteStudentId = null;
}

function confirmDelete() {
    if (currentDeleteStudentId) {
        deleteStudent(currentDeleteStudentId);
        closeDeleteModal();
    }
}

function openPaymentHistoryModal(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    document.getElementById('historyStudentName').textContent = escapeHtml(student.name);

    const historyList = document.getElementById('paymentHistoryList');
    const studentPayments = payments[studentId] || [];

    if (studentPayments.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #6b7280;">No payments recorded yet.</p>';
    } else {
        const sorted = [...studentPayments].sort((a, b) => new Date(b.date) - new Date(a.date));
        historyList.innerHTML = sorted.map(payment => {
            const paymentDate = new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `<div class="payment-history-item"><strong>${payment.month}:</strong> Rs. ${payment.amount.toFixed(2)} - Paid on ${paymentDate}</div>`;
        }).join('');
    }

    document.getElementById('paymentHistoryModal').classList.add('active');
}

function closeHistoryModal() {
    document.getElementById('paymentHistoryModal').classList.remove('active');
}

function saveData() {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
}

function loadData() {
    const studentsData = localStorage.getItem(STUDENTS_KEY);
    const paymentsData = localStorage.getItem(PAYMENTS_KEY);

    if (studentsData) students = JSON.parse(studentsData);
    if (paymentsData) payments = JSON.parse(paymentsData);

    students.forEach(student => {
        if (!payments[student.id]) {
            payments[student.id] = [];
        }
    });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}