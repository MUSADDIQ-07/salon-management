// Application State
let subscribers = [];
let filteredSubscribers = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentSort = { field: 'name', direction: 'asc' };

// Sample data
const sampleData = [
    {
        id: 1,
        name: "Sarah Johnson",
        phone: "+1-555-0123",
        email: "sarah.johnson@email.com",
        address: "123 Main St, City",
        subscriptionType: "Yearly",
        startDate: "2025-01-15",
        services: ["Haircut", "Hair Color", "Facial"],
        amount: 1200,
        paymentMethod: "Card",
        notes: "Regular customer, prefers morning appointments"
    },
    {
        id: 2,
        name: "Maria Garcia",
        phone: "+1-555-0456",
        email: "maria.garcia@email.com",
        address: "456 Oak Ave, City",
        subscriptionType: "Half-yearly",
        startDate: "2025-03-10",
        services: ["Manicure", "Pedicure", "Facial"],
        amount: 600,
        paymentMethod: "UPI",
        notes: "Allergic to certain nail polish brands"
    },
    {
        id: 3,
        name: "Jennifer Smith",
        phone: "+1-555-0789",
        email: "jen.smith@email.com",
        address: "789 Pine Rd, City",
        subscriptionType: "Monthly",
        startDate: "2025-08-01",
        services: ["Haircut", "Massage"],
        amount: 150,
        paymentMethod: "Cash",
        notes: "Prefers specific stylist"
    }
];

// Utility Functions
function generateId() {
    return subscribers.length > 0 ? Math.max(...subscribers.map(s => s.id)) + 1 : 1;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function calculateSubscriptionStatus(startDate, subscriptionType) {
    if (!startDate) return 'unknown';
    
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let duration;
    switch (subscriptionType) {
        case 'Monthly': duration = 30; break;
        case 'Quarterly': duration = 90; break;
        case 'Half-yearly': duration = 180; break;
        case 'Yearly': duration = 365; break;
        default: duration = 30;
    }
    
    if (diffDays < 0) return 'active'; // Future start date
    if (diffDays > duration) return 'expired';
    if (diffDays > duration - 30) return 'expiring';
    return 'active';
}

function getExpiryDate(startDate, subscriptionType) {
    if (!startDate) return null;
    
    const start = new Date(startDate);
    let duration;
    switch (subscriptionType) {
        case 'Monthly': duration = 30; break;
        case 'Quarterly': duration = 90; break;
        case 'Half-yearly': duration = 180; break;
        case 'Yearly': duration = 365; break;
        default: duration = 30;
    }
    
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + duration);
    return expiry;
}

function showMessage(message, type = 'success') {
    // Create message element if it doesn't exist
    let messageEl = document.getElementById('message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'message';
        messageEl.className = 'message';
        document.querySelector('.container').insertBefore(messageEl, document.querySelector('.container').firstChild);
    }
    
    messageEl.textContent = message;
    messageEl.className = `message message--${type} show`;
    
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 3000);
}

// Tab Navigation - Fixed
function initTabNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = btn.getAttribute('data-tab');
            
            // Update active nav button
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(tab => {
                tab.classList.remove('active');
            });
            
            const targetTabContent = document.getElementById(targetTab);
            if (targetTabContent) {
                targetTabContent.classList.add('active');
                
                // Trigger updates for specific tabs with slight delay to ensure DOM is ready
                setTimeout(() => {
                    if (targetTab === 'dashboard') {
                        updateDashboard();
                    } else if (targetTab === 'view-all') {
                        filteredSubscribers = [...subscribers];
                        updateSubscribersTable();
                    } else if (targetTab === 'reports') {
                        updateReports();
                    }
                }, 50);
            }
        });
    });
}

// Form Validation
function validateForm(form) {
    const errors = {};
    const formData = new FormData(form);
    
    // Required fields
    if (!formData.get('name').trim()) {
        errors.name = 'Name is required';
    }
    
    if (!formData.get('phone').trim()) {
        errors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.get('phone').trim())) {
        errors.phone = 'Please enter a valid phone number';
    }
    
    const email = formData.get('email').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Please enter a valid email address';
    }
    
    // Clear previous errors
    const allFields = ['name', 'phone', 'email'];
    allFields.forEach(field => {
        const errorEl = document.getElementById(`${field}Error`);
        const inputEl = form.querySelector(`[name="${field}"]`);
        
        if (errorEl) {
            errorEl.classList.remove('show');
        }
        if (inputEl) {
            inputEl.classList.remove('error');
        }
    });
    
    // Display errors
    Object.keys(errors).forEach(field => {
        const errorEl = document.getElementById(`${field}Error`);
        const inputEl = form.querySelector(`[name="${field}"]`);
        
        if (errorEl) {
            errorEl.textContent = errors[field];
            errorEl.classList.add('show');
        }
        if (inputEl) {
            inputEl.classList.add('error');
        }
    });
    
    return Object.keys(errors).length === 0;
}

// Add Subscriber - Fixed form clearing
function initAddSubscriber() {
    const form = document.getElementById('subscriberForm');
    const startDateInput = document.getElementById('startDate');
    
    // Set default date to today
    if (startDateInput) {
        startDateInput.value = new Date().toISOString().split('T')[0];
    }
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!validateForm(form)) {
            return;
        }
        
        const formData = new FormData(form);
        const services = Array.from(form.querySelectorAll('input[name="services"]:checked'))
            .map(cb => cb.value);
        
        const newSubscriber = {
            id: generateId(),
            name: formData.get('name').trim(),
            phone: formData.get('phone').trim(),
            email: formData.get('email').trim(),
            address: formData.get('address').trim(),
            subscriptionType: formData.get('subscriptionType'),
            startDate: formData.get('startDate'),
            services: services,
            amount: parseFloat(formData.get('amount')) || 0,
            paymentMethod: formData.get('paymentMethod'),
            notes: formData.get('notes').trim()
        };
        
        subscribers.push(newSubscriber);
        
        // Clear form properly
        form.reset();
        
        // Reset checkboxes explicitly
        form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        // Reset date to today
        if (startDateInput) {
            startDateInput.value = new Date().toISOString().split('T')[0];
        }
        
        // Clear any error states
        form.querySelectorAll('.error').forEach(el => {
            el.classList.remove('error');
        });
        form.querySelectorAll('.error-message.show').forEach(el => {
            el.classList.remove('show');
        });
        
        showMessage('Subscriber added successfully!', 'success');
        updateDashboard();
    });
}

// Edit Subscriber
function initEditSubscriber() {
    const modal = document.getElementById('editModal');
    const form = document.getElementById('editSubscriberForm');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelEdit');
    
    // Populate services checkboxes in edit form
    const servicesContainer = document.getElementById('editServices');
    const services = ["Haircut", "Hair Color", "Facial", "Manicure", "Pedicure", "Massage", "Other"];
    
    servicesContainer.innerHTML = '';
    services.forEach(service => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `
            <input type="checkbox" name="services" value="${service}">
            <span>${service}</span>
        `;
        servicesContainer.appendChild(label);
    });
    
    // Close modal handlers
    [closeBtn, cancelBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }
    });
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
    
    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!validateForm(form)) {
            return;
        }
        
        const formData = new FormData(form);
        const services = Array.from(form.querySelectorAll('input[name="services"]:checked'))
            .map(cb => cb.value);
        
        const subscriberId = parseInt(formData.get('id'));
        const subscriberIndex = subscribers.findIndex(s => s.id === subscriberId);
        
        if (subscriberIndex !== -1) {
            subscribers[subscriberIndex] = {
                ...subscribers[subscriberIndex],
                name: formData.get('name').trim(),
                phone: formData.get('phone').trim(),
                email: formData.get('email').trim(),
                address: formData.get('address').trim(),
                subscriptionType: formData.get('subscriptionType'),
                startDate: formData.get('startDate'),
                services: services,
                amount: parseFloat(formData.get('amount')) || 0,
                paymentMethod: formData.get('paymentMethod'),
                notes: formData.get('notes').trim()
            };
            
            modal.classList.add('hidden');
            filteredSubscribers = [...subscribers];
            updateSubscribersTable();
            updateDashboard();
            showMessage('Subscriber updated successfully!', 'success');
        }
    });
}

function openEditModal(subscriberId) {
    const subscriber = subscribers.find(s => s.id === subscriberId);
    if (!subscriber) return;
    
    const modal = document.getElementById('editModal');
    const form = document.getElementById('editSubscriberForm');
    
    // Populate form fields
    form.querySelector('#editId').value = subscriber.id;
    form.querySelector('#editName').value = subscriber.name;
    form.querySelector('#editPhone').value = subscriber.phone;
    form.querySelector('#editEmail').value = subscriber.email || '';
    form.querySelector('#editAddress').value = subscriber.address || '';
    form.querySelector('#editSubscriptionType').value = subscriber.subscriptionType;
    form.querySelector('#editStartDate').value = subscriber.startDate || '';
    form.querySelector('#editAmount').value = subscriber.amount || '';
    form.querySelector('#editPaymentMethod').value = subscriber.paymentMethod;
    form.querySelector('#editNotes').value = subscriber.notes || '';
    
    // Set service checkboxes
    const serviceCheckboxes = form.querySelectorAll('input[name="services"]');
    serviceCheckboxes.forEach(cb => {
        cb.checked = subscriber.services && subscriber.services.includes(cb.value);
    });
    
    modal.classList.remove('hidden');
}

// Delete Subscriber
function initDeleteSubscriber() {
    const confirmModal = document.getElementById('confirmModal');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');
    let deleteId = null;
    
    window.deleteSubscriber = (subscriberId) => {
        deleteId = subscriberId;
        const subscriber = subscribers.find(s => s.id === subscriberId);
        document.getElementById('confirmMessage').textContent = 
            `Are you sure you want to delete ${subscriber?.name || 'this subscriber'}?`;
        confirmModal.classList.remove('hidden');
    };
    
    confirmYes.addEventListener('click', () => {
        if (deleteId) {
            subscribers = subscribers.filter(s => s.id !== deleteId);
            filteredSubscribers = [...subscribers];
            updateSubscribersTable();
            updateDashboard();
            showMessage('Subscriber deleted successfully!', 'success');
            deleteId = null;
        }
        confirmModal.classList.add('hidden');
    });
    
    confirmNo.addEventListener('click', () => {
        deleteId = null;
        confirmModal.classList.add('hidden');
    });
    
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            deleteId = null;
            confirmModal.classList.add('hidden');
        }
    });
}

// Search and Filter
function initSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('filterSubscriptionType');
    const statusFilter = document.getElementById('filterStatus');
    
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const typeFilter_value = typeFilter.value;
        const statusFilter_value = statusFilter.value;
        
        filteredSubscribers = subscribers.filter(subscriber => {
            const matchesSearch = !searchTerm || 
                subscriber.name.toLowerCase().includes(searchTerm) ||
                subscriber.phone.toLowerCase().includes(searchTerm) ||
                (subscriber.email && subscriber.email.toLowerCase().includes(searchTerm));
            
            const matchesType = !typeFilter_value || subscriber.subscriptionType === typeFilter_value;
            
            const status = calculateSubscriptionStatus(subscriber.startDate, subscriber.subscriptionType);
            const matchesStatus = !statusFilter_value || status === statusFilter_value;
            
            return matchesSearch && matchesType && matchesStatus;
        });
        
        currentPage = 1;
        updateSubscribersTable();
    }
    
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (typeFilter) typeFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
}

// Sorting
function initSorting() {
    const tableHeaders = document.querySelectorAll('.subscribers-table th[data-sort]');
    
    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');
            
            if (currentSort.field === field) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                currentSort.direction = 'asc';
            }
            
            sortSubscribers();
            updateSubscribersTable();
        });
    });
}

function sortSubscribers() {
    filteredSubscribers.sort((a, b) => {
        let aVal = a[currentSort.field];
        let bVal = b[currentSort.field];
        
        // Handle special cases
        if (currentSort.field === 'status') {
            aVal = calculateSubscriptionStatus(a.startDate, a.subscriptionType);
            bVal = calculateSubscriptionStatus(b.startDate, b.subscriptionType);
        }
        
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Table Update - Fixed
function updateSubscribersTable() {
    const tableBody = document.getElementById('subscribersTableBody');
    
    if (!tableBody) return;
    
    // Ensure filteredSubscribers is populated
    if (filteredSubscribers.length === 0 && subscribers.length > 0) {
        filteredSubscribers = [...subscribers];
    }
    
    sortSubscribers();
    
    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredSubscribers.slice(startIndex, endIndex);
    
    // Generate table rows
    if (pageData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No subscribers found</td></tr>';
    } else {
        tableBody.innerHTML = pageData.map(subscriber => {
            const status = calculateSubscriptionStatus(subscriber.startDate, subscriber.subscriptionType);
            return `
                <tr>
                    <td>${subscriber.name}</td>
                    <td>${subscriber.phone}</td>
                    <td>${subscriber.subscriptionType}</td>
                    <td>${formatDate(subscriber.startDate)}</td>
                    <td>
                        <span class="status-badge status-badge--${status}">
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn action-btn--edit" onclick="openEditModal(${subscriber.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn action-btn--delete" onclick="deleteSubscriber(${subscriber.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Update pagination
    updatePagination();
}

// Pagination
function updatePagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    // Next button
    paginationHTML += `
        <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = paginationHTML;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        updateSubscribersTable();
    }
}

// Dashboard Updates
function updateDashboard() {
    updateStats();
    setTimeout(updateChart, 100); // Delay chart update to ensure DOM is ready
    updateRecentSubscribers();
    updateRenewalReminders();
}

function updateStats() {
    const totalSubscribers = subscribers.length;
    const activeSubscriptions = subscribers.filter(s => 
        calculateSubscriptionStatus(s.startDate, s.subscriptionType) === 'active'
    ).length;
    const expiringSubscriptions = subscribers.filter(s => 
        calculateSubscriptionStatus(s.startDate, s.subscriptionType) === 'expiring'
    ).length;
    const totalRevenue = subscribers.reduce((sum, s) => sum + (s.amount || 0), 0);
    
    document.getElementById('totalSubscribers').textContent = totalSubscribers;
    document.getElementById('activeSubscriptions').textContent = activeSubscriptions;
    document.getElementById('expiringSubscriptions').textContent = expiringSubscriptions;
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toLocaleString()}`;
}

// Fixed Chart Update
function updateChart() {
    const ctx = document.getElementById('subscriptionChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (window.subscriptionChart) {
        window.subscriptionChart.destroy();
    }
    
    const subscriptionTypes = subscribers.reduce((acc, subscriber) => {
        acc[subscriber.subscriptionType] = (acc[subscriber.subscriptionType] || 0) + 1;
        return acc;
    }, {});
    
    // If no data, show placeholder
    if (Object.keys(subscriptionTypes).length === 0) {
        subscriptionTypes['No Data'] = 1;
    }
    
    const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5'];
    
    window.subscriptionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(subscriptionTypes),
            datasets: [{
                data: Object.values(subscriptionTypes),
                backgroundColor: colors.slice(0, Object.keys(subscriptionTypes).length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

function updateRecentSubscribers() {
    const container = document.getElementById('recentSubscribers');
    if (!container) return;
    
    const recentSubscribers = [...subscribers]
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .slice(0, 5);
    
    if (recentSubscribers.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No subscribers yet</p></div>';
        return;
    }
    
    container.innerHTML = recentSubscribers.map(subscriber => `
        <div class="recent-item">
            <div class="recent-info">
                <h4>${subscriber.name}</h4>
                <p>${subscriber.subscriptionType} - ${subscriber.phone}</p>
            </div>
            <div class="recent-date">${formatDate(subscriber.startDate)}</div>
        </div>
    `).join('');
}

function updateRenewalReminders() {
    const container = document.getElementById('renewalReminders');
    if (!container) return;
    
    const expiringSubscribers = subscribers.filter(subscriber => {
        const status = calculateSubscriptionStatus(subscriber.startDate, subscriber.subscriptionType);
        return status === 'expiring';
    });
    
    if (expiringSubscribers.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No upcoming renewals</p></div>';
        return;
    }
    
    container.innerHTML = expiringSubscribers.map(subscriber => {
        const expiryDate = getExpiryDate(subscriber.startDate, subscriber.subscriptionType);
        return `
            <div class="recent-item">
                <div class="recent-info">
                    <h4>${subscriber.name}</h4>
                    <p>Expires: ${formatDate(expiryDate)}</p>
                </div>
                <div class="recent-date">${subscriber.phone}</div>
            </div>
        `;
    }).join('');
}

// Reports - Fixed
function updateReports() {
    setTimeout(() => {
        updateRevenueChart();
        updateServicesChart();
        updatePaymentMethodsReport();
        updateStatusSummary();
    }, 100);
}

function updateRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (window.revenueChart) {
        window.revenueChart.destroy();
    }
    
    // Generate monthly revenue data for the past 6 months
    const months = [];
    const revenues = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push(month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        
        const monthlyRevenue = subscribers
            .filter(s => {
                if (!s.startDate) return false;
                const startDate = new Date(s.startDate);
                return startDate.getMonth() === month.getMonth() && 
                       startDate.getFullYear() === month.getFullYear();
            })
            .reduce((sum, s) => sum + (s.amount || 0), 0);
        
        revenues.push(monthlyRevenue);
    }
    
    window.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Revenue',
                data: revenues,
                borderColor: '#1FB8CD',
                backgroundColor: 'rgba(31, 184, 205, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function updateServicesChart() {
    const ctx = document.getElementById('servicesChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (window.servicesChart) {
        window.servicesChart.destroy();
    }
    
    const serviceCount = {};
    subscribers.forEach(subscriber => {
        if (subscriber.services) {
            subscriber.services.forEach(service => {
                serviceCount[service] = (serviceCount[service] || 0) + 1;
            });
        }
    });
    
    // If no data, show placeholder
    if (Object.keys(serviceCount).length === 0) {
        serviceCount['No Services'] = 0;
    }
    
    const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C'];
    
    window.servicesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(serviceCount),
            datasets: [{
                label: 'Popularity',
                data: Object.values(serviceCount),
                backgroundColor: colors.slice(0, Object.keys(serviceCount).length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function updatePaymentMethodsReport() {
    const container = document.getElementById('paymentMethodsReport');
    if (!container) return;
    
    const paymentMethods = subscribers.reduce((acc, subscriber) => {
        acc[subscriber.paymentMethod] = (acc[subscriber.paymentMethod] || 0) + 1;
        return acc;
    }, {});
    
    if (Object.keys(paymentMethods).length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-credit-card"></i><p>No payment data available</p></div>';
        return;
    }
    
    container.innerHTML = Object.entries(paymentMethods).map(([method, count]) => `
        <div class="payment-method-item">
            <div class="payment-method-name">${method}</div>
            <div class="payment-method-count">${count}</div>
        </div>
    `).join('');
}

function updateStatusSummary() {
    const container = document.getElementById('statusSummary');
    if (!container) return;
    
    const statusCount = subscribers.reduce((acc, subscriber) => {
        const status = calculateSubscriptionStatus(subscriber.startDate, subscriber.subscriptionType);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    
    if (Object.keys(statusCount).length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>No status data available</p></div>';
        return;
    }
    
    container.innerHTML = Object.entries(statusCount).map(([status, count]) => `
        <div class="payment-method-item">
            <div class="payment-method-name">
                <span class="status-badge status-badge--${status}">
                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </div>
            <div class="payment-method-count">${count}</div>
        </div>
    `).join('');
}

// Export CSV
function initExportCSV() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportToCSV();
        });
    }
}

function exportToCSV() {
    if (subscribers.length === 0) {
        showMessage('No data to export', 'error');
        return;
    }
    
    const headers = [
        'Name', 'Phone', 'Email', 'Address', 'Subscription Type', 
        'Start Date', 'Services', 'Amount', 'Payment Method', 'Notes', 'Status'
    ];
    
    const csvContent = [
        headers.join(','),
        ...subscribers.map(subscriber => [
            `"${subscriber.name}"`,
            `"${subscriber.phone}"`,
            `"${subscriber.email || ''}"`,
            `"${subscriber.address || ''}"`,
            `"${subscriber.subscriptionType}"`,
            `"${subscriber.startDate || ''}"`,
            `"${subscriber.services ? subscriber.services.join('; ') : ''}"`,
            subscriber.amount || 0,
            `"${subscriber.paymentMethod}"`,
            `"${subscriber.notes || ''}"`,
            `"${calculateSubscriptionStatus(subscriber.startDate, subscriber.subscriptionType)}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `salon_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('Data exported successfully!', 'success');
}

// Clear Data
function initClearData() {
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const confirmModal = document.getElementById('confirmModal');
            document.getElementById('confirmMessage').textContent = 
                'Are you sure you want to clear all data? This action cannot be undone.';
            
            const confirmYes = document.getElementById('confirmYes');
            confirmYes.onclick = () => {
                subscribers = [];
                filteredSubscribers = [];
                updateDashboard();
                updateSubscribersTable();
                confirmModal.classList.add('hidden');
                showMessage('All data cleared successfully!', 'success');
            };
            
            confirmModal.classList.remove('hidden');
        });
    }
}

// Initialize Application
function init() {
    // Load sample data
    subscribers = [...sampleData];
    filteredSubscribers = [...subscribers];
    
    // Initialize all components
    initTabNavigation();
    initAddSubscriber();
    initEditSubscriber();
    initDeleteSubscriber();
    initSearchAndFilter();
    initSorting();
    initExportCSV();
    initClearData();
    
    // Initial updates
    updateDashboard();
    updateSubscribersTable();
    
    // Make functions globally available
    window.openEditModal = openEditModal;
    window.goToPage = goToPage;
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);