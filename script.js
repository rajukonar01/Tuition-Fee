const STUDENTS_KEY = 'tuition_students';
const PAYMENTS_KEY = 'tuition_payments';

let students = [];
let payments = {};
let currentPayment = null;
let pendingImportData = null;

// Month format: JUN-26, JUL-26, ... JUN-27
// Starting from June 2026 to June 2027 (13 months)
const monthsConfig = [
    { month: 6, year: 2026, label: 'JUN-26', value: '2026-06' },
    { month: 7, year: 2026, label: 'JUL-26', value: '2026-07' },
    { month: 8, year: 2026, label: 'AUG-26', value: '2026-08' },
    { month: 9, year: 2026, label: 'SEP-26', value: '2026-09' },
    { month: 10, year: 2026, label: 'OCT-26', value: '2026-10' },
    { month: 11, year: 2026, label: 'NOV-26', value: '2026-11' },
    { month: 12, year: 2026, label: 'DEC-26', value: '2026-12' },
    { month: 1, year: 2027, label: 'JAN-27', value: '2027-01' },
    { month: 2, year: 2027, label: 'FEB-27', value: '2027-02' },
    { month: 3, year: 2027, label: 'MAR-27', value: '2027-03' },
    { month: 4, year: 2027, label: 'APR-27', value: '2027-04' },
    { month: 5, year: 2027, label: 'MAY-27', value: '2027-05' },
    { month: 6, year: 2027, label: 'JUN-27', value: '2027-06' }
];

const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const shortMonthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    loadData();
    initializeUI();
    renderTable();
    setupEventListeners();
    showStatus('✓ Application loaded successfully', 'success');
});

function initializeUI() {
    const joiningDateInput = document.getElementById('joiningDate');
    if (joiningDateInput) {
        joiningDateInput.valueAsDate = new Date();
    }
}

function setupEventListeners() {
    // Add Student
    const addBtn = document.getElementById('addStudentBtn');
    if (addBtn) addBtn.addEventListener('click', openAddModal);
    
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    if (cancelAddBtn) cancelAddBtn.addEventListener('click', closeAddModal);
    
    const form = document.getElementById('addStudentForm');
    if (form) form.addEventListener('submit', handleAddStudent);

    // Payment Modal
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    if (cancelPaymentBtn) cancelPaymentBtn.addEventListener('click', closePaymentModal);
    
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    if (confirmPaymentBtn) confirmPaymentBtn.addEventListener('click', confirmPayment);

    // Delete Payment
    const deletePaymentBtn = document.getElementById('deletePaymentBtn');
    if (deletePaymentBtn) deletePaymentBtn.addEventListener('click', deletePayment);

    // Import/Export
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportData);
    
    const importBtn = document.getElementById('importBtn');
    if (importBtn) importBtn.addEventListener('click', triggerImport);
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.addEventListener('change', handleFileImport);

    // Import confirmation
    const mergeImportBtn = document.getElementById('mergeImportBtn');
    if (mergeImportBtn) mergeImportBtn.addEventListener('click', () => proceedImport(false));
    
    const replaceImportBtn = document.getElementById('replaceImportBtn');
    if (replaceImportBtn) replaceImportBtn.addEventListener('click', () => proceedImport(true));
    
    const cancelImportBtn = document.getElementById('cancelImportBtn');
    if (cancelImportBtn) cancelImportBtn.addEventListener('click', cancelImport);

    // Date option radio
    document.querySelectorAll('input[name="dateOption"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const customDateInput = document.getElementById('customPaymentDate');
            if (customDateInput) {
                customDateInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
            }
        });
    });
}

// Status Message
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 3000);
}

// Format date to D-MMM format (e.g., 5-MAR)
function formatDateToDMMM(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = shortMonthNames[date.getMonth()];
    return `${day}-${month}`;
}

// Add Student Modal
function openAddModal() {
    const modal = document.getElementById('addStudentModal');
    if (modal) modal.classList.add('active');
}

function closeAddModal() {
    const form = document.getElementById('addStudentForm');
    if (form) form.reset();
    
    const modal = document.getElementById('addStudentModal');
    if (modal) modal.classList.remove('active');
    
    const joiningDateInput = document.getElementById('joiningDate');
    if (joiningDateInput) joiningDateInput.valueAsDate = new Date();
}

function handleAddStudent(e) {
    e.preventDefault();

    const name = document.getElementById('studentName').value.trim();
    const phone = document.getElementById('studentPhone').value.trim();
    const fee = parseFloat(document.getElementById('studentFee').value);
    const joiningDate = document.getElementById('joiningDate').value;

    if (!name || !phone || !fee || !joiningDate) {
        showStatus('Please fill all fields', 'error');
        return;
    }

    const id = Date.now().toString();
    students.push({ id, name, phone, fee, joiningDate });
    payments[id] = [];
    
    saveData();
    renderTable();
    closeAddModal();
    showStatus(`Student "${name}" added successfully`, 'success');
}

// Table Rendering
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');

    if (!tableBody || !emptyState) return;

    if (students.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tableBody.innerHTML = students.map(student => createTableRow(student)).join('');

    // Add click listeners to month cells AFTER rendering
    setTimeout(() => {
        document.querySelectorAll('.month-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                const studentId = cell.dataset.studentId;
                const monthStr = cell.dataset.month;
                console.log('Clicked month cell:', studentId, monthStr);
                openPaymentModal(studentId, monthStr);
            });
        });
    }, 0);
}

function createTableRow(student) {
    const { id, name, phone, fee, joiningDate } = student;
    const joiningDate_obj = new Date(joiningDate);
    const joiningMonth = joiningDate_obj.getMonth() + 1;
    const joiningYear = joiningDate_obj.getFullYear();

    let monthCells = '';
    
    // Loop through all 13 months (JUN-26 to JUN-27)
    monthsConfig.forEach(monthConfig => {
        const monthStr = monthConfig.value;
        const payment = payments[id]?.find(p => p.month === monthStr);
        
        let cellContent = '';
        
        // Check if the student has joined yet for this month
        const isBeforeJoining = (monthConfig.month < joiningMonth && monthConfig.year === joiningYear) ||
                               (monthConfig.year < joiningYear);
        
        if (isBeforeJoining) {
            cellContent = '<span class="not-applicable">-</span>';
        } else if (payment) {
            const paymentDate = formatDateToDMMM(payment.date);
            const period = payment.period ? payment.period : '';
            cellContent = `
                <div class="payment-cell">
                    <div class="paid-status">✓</div>
                    <div class="payment-date">${paymentDate}</div>
                    ${period ? `<div class="payment-period">${period}</div>` : ''}
                </div>
            `;
        } else {
            cellContent = '<div class="payment-cell"><span class="unpaid-status">-</span></div>';
        }
        
        monthCells += `<td class="month-cell" data-student-id="${id}" data-month="${monthStr}">${cellContent}</td>`;
    });

    return `
        <tr class="student-row" data-id="${id}">
            <td class="name-cell">${escapeHtml(name)}</td>
            <td class="phone-cell">${escapeHtml(phone)}</td>
            <td class="fee-cell">Rs. ${fee.toFixed(2)}</td>
            <td class="date-cell">${new Date(joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            ${monthCells}
        </tr>
    `;
}

// Payment Modal
function openPaymentModal(studentId, monthStr) {
    console.log('Opening payment modal for:', studentId, monthStr);
    
    const student = students.find(s => s.id === studentId);
    const payment = payments[studentId]?.find(p => p.month === monthStr);
    
    if (!student) {
        console.error('Student not found:', studentId);
        return;
    }

    // Find the month config for this month string
    const monthConfig = monthsConfig.find(m => m.value === monthStr);
    if (!monthConfig) {
        console.error('Month not found:', monthStr);
        return;
    }

    currentPayment = { studentId, monthStr };
    console.log('Current payment set to:', currentPayment);

    document.getElementById('paymentStudentName').textContent = escapeHtml(student.name);
    document.getElementById('paymentMonthName').textContent = `${monthConfig.label}`;

    // Show/hide delete button based on whether payment exists
    const deleteBtn = document.getElementById('deletePaymentBtn');
    if (deleteBtn) {
        deleteBtn.style.display = payment ? 'block' : 'none';
    }

    if (payment) {
        console.log('Existing payment found:', payment);
        document.getElementById('customPaymentDate').value = payment.date;
        document.getElementById('paymentPeriodFrom').value = payment.periodFrom || '';
        document.getElementById('paymentPeriodTo').value = payment.periodTo || '';
    } else {
        const today = new Date().toISOString().split('T')[0];
        console.log('No existing payment, using today:', today);
        document.getElementById('customPaymentDate').value = today;
        document.getElementById('paymentPeriodFrom').value = today;
        document.getElementById('paymentPeriodTo').value = today;
    }

    const radioToday = document.querySelector('input[name="dateOption"][value="today"]');
    if (radioToday) radioToday.checked = true;
    const customDateInput = document.getElementById('customPaymentDate');
    if (customDateInput) customDateInput.style.display = 'none';

    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.add('active');
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.remove('active');
    currentPayment = null;
}

function confirmPayment() {
    console.log('Confirm payment called, currentPayment:', currentPayment);
    
    if (!currentPayment) {
        showStatus('Payment information missing', 'error');
        return;
    }

    const periodFrom = document.getElementById('paymentPeriodFrom').value;
    const periodTo = document.getElementById('paymentPeriodTo').value;

    if (!periodFrom || !periodTo) {
        showStatus('Please select both From and To dates for the period', 'error');
        return;
    }

    if (new Date(periodFrom) > new Date(periodTo)) {
        showStatus('From date must be before To date', 'error');
        return;
    }

    const dateOption = document.querySelector('input[name="dateOption"]:checked').value;
    let paymentDate;

    if (dateOption === 'today') {
        paymentDate = new Date().toISOString().split('T')[0];
    } else {
        paymentDate = document.getElementById('customPaymentDate').value;
        if (!paymentDate) {
            showStatus('Please select a custom date', 'error');
            return;
        }
    }

    const periodStr = formatPeriodToDMMM(periodFrom, periodTo);
    
    // Record payment
    const student = students.find(s => s.id === currentPayment.studentId);
    if (!student) {
        showStatus('Student not found', 'error');
        return;
    }

    console.log('Recording payment for student:', student.name, 'Month:', currentPayment.monthStr);

    if (!payments[currentPayment.studentId]) {
        payments[currentPayment.studentId] = [];
        console.log('Created new payment array for student:', currentPayment.studentId);
    }

    const existingPaymentIndex = payments[currentPayment.studentId].findIndex(p => p.month === currentPayment.monthStr);
    
    const paymentObject = {
        month: currentPayment.monthStr,
        date: paymentDate,
        amount: student.fee,
        period: periodStr,
        periodFrom: periodFrom,
        periodTo: periodTo
    };

    if (existingPaymentIndex > -1) {
        console.log('Updating existing payment at index:', existingPaymentIndex);
        payments[currentPayment.studentId][existingPaymentIndex] = paymentObject;
    } else {
        console.log('Adding new payment');
        payments[currentPayment.studentId].push(paymentObject);
    }

    console.log('Payments after update:', payments);

    saveData();
    console.log('Data saved');
    
    closePaymentModal();
    
    // This is critical - re-render the table to show the update
    renderTable();
    console.log('Table re-rendered');
    
    showStatus('✓ Payment saved successfully', 'success');
}

// Format period to D-MMM - D-MMM format (e.g., 5-MAR - 15-MAR)
function formatPeriodToDMMM(fromDate, toDate) {
    const from = formatDateToDMMM(fromDate);
    const to = formatDateToDMMM(toDate);
    return `${from} - ${to}`;
}

// Delete Payment
function deletePayment() {
    if (!currentPayment) {
        showStatus('No payment to delete', 'error');
        return;
    }

    if (confirm('Are you sure you want to delete this payment record?')) {
        const studentPayments = payments[currentPayment.studentId];
        if (studentPayments) {
            const index = studentPayments.findIndex(p => p.month === currentPayment.monthStr);
            if (index > -1) {
                studentPayments.splice(index, 1);
                console.log('Payment deleted');
                saveData();
                renderTable();
                closePaymentModal();
                showStatus('✓ Payment deleted successfully', 'success');
            }
        }
    }
}

// Export Data
function exportData() {
    const data = {
        students: students,
        payments: payments,
        exportDate: new Date().toISOString()
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tuition_fees_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showStatus('Data exported successfully!', 'success');
}

// Import Data
function triggerImport() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.click();
}

function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target.result;
            let importedData;

            if (file.name.endsWith('.json')) {
                importedData = JSON.parse(content);
            } else if (file.name.endsWith('.csv')) {
                importedData = parseCSV(content);
            } else {
                showStatus('Only JSON and CSV files are supported', 'error');
                return;
            }

            if (!importedData.students || !importedData.payments) {
                showStatus('Invalid file format. Please use a file exported from this application.', 'error');
                return;
            }

            pendingImportData = importedData;
            const modal = document.getElementById('importConfirmModal');
            if (modal) modal.classList.add('active');
        } catch (error) {
            showStatus('Error reading file: ' + error.message, 'error');
        }
        document.getElementById('fileInput').value = '';
    };
    reader.readAsText(file);
}

function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file is empty or invalid');
    }

    const studentsArr = [];
    const paymentsObj = {};

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 4) continue;

        const [name, phone, fee, joiningDate] = values;
        
        let student = studentsArr.find(s => s.name === name && s.phone === phone);
        if (!student) {
            const id = `csv_${Date.now()}_${i}`;
            student = { id, name, phone, fee: parseFloat(fee), joiningDate };
            studentsArr.push(student);
            paymentsObj[id] = [];
        }

        if (values.length >= 8) {
            const [, , , , month, paymentDate, periodFrom, periodTo] = values;
            if (month && paymentDate) {
                const periodStr = periodFrom && periodTo ? `${periodFrom} - ${periodTo}` : '';
                paymentsObj[student.id].push({
                    month: month,
                    date: paymentDate,
                    amount: parseFloat(fee),
                    period: periodStr,
                    periodFrom: periodFrom || '',
                    periodTo: periodTo || ''
                });
            }
        }
    }

    return { students: studentsArr, payments: paymentsObj, exportDate: new Date().toISOString() };
}

function proceedImport(replace) {
    if (!pendingImportData) return;

    if (replace) {
        students = pendingImportData.students;
        payments = pendingImportData.payments;
    } else {
        pendingImportData.students.forEach(importedStudent => {
            const existingIndex = students.findIndex(s => s.phone === importedStudent.phone);
            if (existingIndex === -1) {
                const newId = Date.now().toString() + Math.random();
                const newStudent = { ...importedStudent, id: newId };
                students.push(newStudent);
                payments[newId] = pendingImportData.payments[importedStudent.id] || [];
            } else {
                const existingStudent = students[existingIndex];
                if (!payments[existingStudent.id]) {
                    payments[existingStudent.id] = [];
                }

                const importedPayments = pendingImportData.payments[importedStudent.id] || [];
                importedPayments.forEach(importedPayment => {
                    const existingPaymentIndex = payments[existingStudent.id].findIndex(
                        p => p.month === importedPayment.month
                    );
                    if (existingPaymentIndex === -1) {
                        payments[existingStudent.id].push(importedPayment);
                    } else {
                        const existing = payments[existingStudent.id][existingPaymentIndex];
                        if (new Date(importedPayment.date) > new Date(existing.date)) {
                            payments[existingStudent.id][existingPaymentIndex] = importedPayment;
                        }
                    }
                });
            }
        });
    }

    saveData();
    renderTable();
    const modal = document.getElementById('importConfirmModal');
    if (modal) modal.classList.remove('active');
    pendingImportData = null;
    showStatus('Data imported successfully!', 'success');
}

function cancelImport() {
    const modal = document.getElementById('importConfirmModal');
    if (modal) modal.classList.remove('active');
    pendingImportData = null;
}

// Data Persistence
function saveData() {
    try {
        localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
        localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
        console.log('Data saved to localStorage successfully');
    } catch (error) {
        console.error('Error saving data:', error);
        showStatus('Error saving data', 'error');
    }
}

function loadData() {
    try {
        console.log('Loading data from localStorage...');
        
        const studentsData = localStorage.getItem(STUDENTS_KEY);
        const paymentsData = localStorage.getItem(PAYMENTS_KEY);

        if (studentsData) {
            students = JSON.parse(studentsData);
            console.log(`Loaded ${students.length} students`);
        } else {
            students = [];
        }

        if (paymentsData) {
            payments = JSON.parse(paymentsData);
            console.log('Loaded payment records');
        } else {
            payments = {};
        }

        // Ensure all students have payment records
        students.forEach(student => {
            if (!payments[student.id]) {
                payments[student.id] = [];
            }
        });

        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        students = [];
        payments = {};
    }
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

// Auto-save on window unload
window.addEventListener('beforeunload', () => {
    console.log('Saving data before unload');
    saveData();
});

// Periodic auto-save every 30 seconds
setInterval(() => {
    if (students.length > 0 || Object.keys(payments).length > 0) {
        console.log('Auto-saving data...');
        saveData();
    }
}, 30000);
