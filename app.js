// Application State
let subscribers = [];
let filteredSubscribers = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentSort = { field: 'name', direction: 'asc' };

// GitHub Integration State
let lastExportTime = null;
let changesSinceExport = 0;
let backupReminderInterval = null;

// Local Storage Keys
const STORAGE_KEY = 'salon_subscribers_data';
const GITHUB_SETTINGS_KEY = 'salon_github_settings';

// Sample data for initial setup
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
        notes: "Regular customer, prefers morning appointments",
        createdAt: "2025-01-15T10:30:00Z",
        updatedAt: "2025-01-15T10:30:00Z"
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
        notes: "Allergic to certain nail polish brands",
        createdAt: "2025-03-10T14:20:00Z",
        updatedAt: "2025-03-10T14:20:00Z"
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
        notes: "Prefers specific stylist",
        createdAt: "2025-08-01T09:15:00Z",
        updatedAt: "2025-08-01T09:15:00Z"
    }
];

// GitHub Settings
let githubSettings = {
    enableBackupReminders: true,
    autoExportAfterAdd: true,
    compressExports: false,
    defaultFormats: ['json', 'csv', 'markdown'],
    reminderInterval: 7 // days
};

// Persistent Data Storage Functions
function saveToStorage() {
    try {
        const dataToSave = {
            subscribers: subscribers,
            timestamp: new Date().toISOString(),
            version: '2.0',
            lastExportTime: lastExportTime,
            changesSinceExport: changesSinceExport
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        
        // Save GitHub settings separately
        localStorage.setItem(GITHUB_SETTINGS_KEY, JSON.stringify(githubSettings));
        
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        showMessage('Error saving data. Storage may be full.', 'error');
        return false;
    }
}

function loadFromStorage() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            subscribers = parsedData.subscribers || [];
            lastExportTime = parsedData.lastExportTime;
            changesSinceExport = parsedData.changesSinceExport || 0;
        } else {
            // First time user - load sample data
            subscribers = [...sampleData];
            saveToStorage();
        }

        // Load GitHub settings
        const savedSettings = localStorage.getItem(GITHUB_SETTINGS_KEY);
        if (savedSettings) {
            githubSettings = { ...githubSettings, ...JSON.parse(savedSettings) };
        }

        return true;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        subscribers = [...sampleData];
        showMessage('Error loading saved data. Using sample data.', 'error');
        return false;
    }
}

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
    
    if (diffDays < 0) return 'active';
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
    let messageEl = document.getElementById('message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'message';
        messageEl.className = 'message';
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(messageEl, container.firstChild);
        }
    }
    
    messageEl.textContent = message;
    messageEl.className = `message message--${type} show`;
    
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 3000);
}

function getCurrentDateString() {
    return new Date().toISOString().split('T')[0];
}

// Tab Navigation - COMPLETELY FIXED
function initTabNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log('Initializing tab navigation:', navBtns.length, 'buttons,', tabContents.length, 'tabs');
    
    navBtns.forEach((btn, index) => {
        console.log(`Button ${index}: data-tab="${btn.getAttribute('data-tab')}"`);
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const targetTab = btn.getAttribute('data-tab');
            console.log('Switching to tab:', targetTab);
            
            // Remove active class from all buttons
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(tab => {
                tab.classList.remove('active');
                tab.style.display = 'none';
            });
            
            // Show target tab
            const targetTabContent = document.getElementById(targetTab);
            if (targetTabContent) {
                targetTabContent.classList.add('active');
                targetTabContent.style.display = 'block';
                console.log('Successfully switched to tab:', targetTab);
                
                // Trigger tab-specific updates
                setTimeout(() => {
                    switch (targetTab) {
                        case 'dashboard':
                            updateDashboard();
                            break;
                        case 'view-all':
                            filteredSubscribers = [...subscribers];
                            updateSubscribersTable();
                            break;
                        case 'reports':
                            updateReports();
                            break;
                        case 'settings':
                            updateSettingsTab();
                            break;
                        case 'github-sync':
                            updateGitHubSyncStatus();
                            break;
                    }
                }, 50);
            } else {
                console.error('Target tab content not found:', targetTab);
            }
        });
    });
    
    // Initialize first tab
    const firstBtn = document.querySelector('.nav-btn.active');
    if (firstBtn) {
        const firstTab = firstBtn.getAttribute('data-tab');
        const firstTabContent = document.getElementById(firstTab);
        if (firstTabContent) {
            tabContents.forEach(tab => {
                tab.classList.remove('active');
                tab.style.display = 'none';
            });
            firstTabContent.classList.add('active');
            firstTabContent.style.display = 'block';
            updateDashboard();
        }
    }
}

// Form Validation - FIXED
function validateForm(form) {
    const errors = {};
    const formData = new FormData(form);
    
    const name = formData.get('name');
    const phone = formData.get('phone');
    const email = formData.get('email');
    
    if (!name || !name.trim()) {
        errors.name = 'Name is required';
    }
    
    if (!phone || !phone.trim()) {
        errors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(phone.trim())) {
        errors.phone = 'Please enter a valid phone number';
    }
    
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = 'Please enter a valid email address';
    }
    
    // Clear previous errors
    const allFields = ['name', 'phone', 'email'];
    allFields.forEach(field => {
        const errorEl = document.getElementById(`${field}Error`);
        const inputEl = form.querySelector(`[name="${field}"]`);
        
        if (errorEl) {
            errorEl.classList.remove('show');
            errorEl.textContent = '';
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

// Add Subscriber - FIXED
function initAddSubscriber() {
    const form = document.getElementById('subscriberForm');
    const startDateInput = document.getElementById('startDate');
    
    if (!form) {
        console.error('Subscriber form not found');
        return;
    }
    
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
            email: formData.get('email').trim() || '',
            address: formData.get('address').trim() || '',
            subscriptionType: formData.get('subscriptionType'),
            startDate: formData.get('startDate'),
            services: services,
            amount: parseFloat(formData.get('amount')) || 0,
            paymentMethod: formData.get('paymentMethod'),
            notes: formData.get('notes').trim() || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        subscribers.push(newSubscriber);
        trackChange();
        
        if (saveToStorage()) {
            // Clear form
            form.reset();
            form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
            if (startDateInput) {
                startDateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // Clear error states
            form.querySelectorAll('.error').forEach(el => {
                el.classList.remove('error');
            });
            form.querySelectorAll('.error-message.show').forEach(el => {
                el.classList.remove('show');
            });
            
            showMessage('Subscriber added successfully! Data automatically saved.', 'success');
            updateDashboard();
            
            // Auto-suggest GitHub backup if enabled
            if (githubSettings.autoExportAfterAdd) {
                setTimeout(() => {
                    showBackupNotification();
                }, 3000);
            }
        }
    });
}

// GitHub Export Functions
function generateJSONExport() {
    const exportData = {
        exportInfo: {
            appName: "Elite Salon Subscriber Management",
            version: "2.0",
            exportDate: new Date().toISOString(),
            totalSubscribers: subscribers.length
        },
        subscribers: subscribers,
        statistics: generateStatistics()
    };
    
    return JSON.stringify(exportData, null, 2);
}

function generateCSVExport() {
    if (subscribers.length === 0) {
        return 'No data available';
    }

    const headers = [
        'ID', 'Name', 'Phone', 'Email', 'Address', 'Subscription Type', 
        'Start Date', 'Services', 'Amount', 'Payment Method', 'Notes', 
        'Status', 'Created At', 'Updated At'
    ];
    
    const csvContent = [
        headers.join(','),
        ...subscribers.map(subscriber => [
            subscriber.id,
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
            `"${calculateSubscriptionStatus(subscriber.startDate, subscriber.subscriptionType)}"`,
            `"${subscriber.createdAt || ''}"`,
            `"${subscriber.updatedAt || ''}"`
        ].join(','))
    ].join('\n');
    
    return csvContent;
}

function generateMarkdownExport() {
    const stats = generateStatistics();
    const currentDate = new Date().toLocaleDateString();
    
    let markdown = `# Elite Salon - Subscriber Management Report\n\n`;
    markdown += `**Generated:** ${currentDate}\n`;
    markdown += `**Total Subscribers:** ${subscribers.length}\n`;
    markdown += `**Application:** Elite Salon Management v2.0\n\n`;
    
    // Statistics Section
    markdown += `## 📊 Statistics\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Subscribers | ${stats.totalSubscribers} |\n`;
    markdown += `| Active Subscriptions | ${stats.activeSubscriptions} |\n`;
    markdown += `| Expiring Soon | ${stats.expiringSubscriptions} |\n`;
    markdown += `| Total Revenue | $${stats.totalRevenue.toLocaleString()} |\n\n`;
    
    // Subscription Types
    markdown += `### Subscription Types Distribution\n\n`;
    Object.entries(stats.subscriptionTypes).forEach(([type, count]) => {
        markdown += `- **${type}:** ${count} subscribers\n`;
    });
    markdown += `\n`;
    
    // Payment Methods
    markdown += `### Payment Methods\n\n`;
    Object.entries(stats.paymentMethods).forEach(([method, count]) => {
        markdown += `- **${method}:** ${count} transactions\n`;
    });
    markdown += `\n`;
    
    // Services Popularity
    markdown += `### Popular Services\n\n`;
    Object.entries(stats.servicesPopularity).forEach(([service, count]) => {
        markdown += `- **${service}:** ${count} subscriptions\n`;
    });
    markdown += `\n`;
    
    // All Subscribers Table
    markdown += `## 👥 All Subscribers\n\n`;
    markdown += `| Name | Phone | Type | Start Date | Status | Amount |\n`;
    markdown += `|------|-------|------|------------|--------|--------|\n`;
    
    subscribers.forEach(subscriber => {
        const status = calculateSubscriptionStatus(subscriber.startDate, subscriber.subscriptionType);
        markdown += `| ${subscriber.name} | ${subscriber.phone} | ${subscriber.subscriptionType} | ${formatDate(subscriber.startDate)} | ${status} | $${subscriber.amount || 0} |\n`;
    });
    
    markdown += `\n---\n`;
    markdown += `*This report was generated automatically by Elite Salon Management System*\n`;
    markdown += `*Last updated: ${currentDate}*`;
    
    return markdown;
}

function generateHTMLExport() {
    const stats = generateStatistics();
    const currentDate = new Date().toLocaleDateString();
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Elite Salon - Subscriber Management</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #1FB8CD; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #dee2e6; }
        .stat-card h3 { margin: 0 0 10px 0; font-size: 2em; color: #1FB8CD; }
        .stat-card p { margin: 0; color: #6c757d; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; font-weight: 600; }
        tr:hover { background-color: #f8f9fa; }
        .status-active { background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; }
        .status-expired { background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; }
        .status-expiring { background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; }
        .footer { text-align: center; color: #6c757d; font-size: 0.9em; margin-top: 40px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎀 Elite Salon Management</h1>
        <p>Subscriber Management Dashboard</p>
        <p>Generated on ${currentDate}</p>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <h3>${stats.totalSubscribers}</h3>
            <p>Total Subscribers</p>
        </div>
        <div class="stat-card">
            <h3>${stats.activeSubscriptions}</h3>
            <p>Active Subscriptions</p>
        </div>
        <div class="stat-card">
            <h3>${stats.expiringSubscriptions}</h3>
            <p>Expiring Soon</p>
        </div>
        <div class="stat-card">
            <h3>$${stats.totalRevenue.toLocaleString()}</h3>
            <p>Total Revenue</p>
        </div>
    </div>
    
    <div class="section">
        <h2>📋 All Subscribers</h2>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Start Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>`;
    
    subscribers.forEach(subscriber => {
        const status = calculateSubscriptionStatus(subscriber.startDate, subscriber.subscriptionType);
        html += `
                <tr>
                    <td>${subscriber.name}</td>
                    <td>${subscriber.phone}</td>
                    <td>${subscriber.email || '-'}</td>
                    <td>${subscriber.subscriptionType}</td>
                    <td>${formatDate(subscriber.startDate)}</td>
                    <td><span class="status-${status}">${status}</span></td>
                    <td>$${subscriber.amount || 0}</td>
                </tr>`;
    });
    
    html += `
            </tbody>
        </table>
    </div>
    
    <div class="footer">
        <p>Generated by Elite Salon Management System v2.0</p>
        <p>© ${new Date().getFullYear()} Elite Salon. All rights reserved.</p>
    </div>
</body>
</html>`;
    
    return html;
}

function generateStatistics() {
    const stats = {
        totalSubscribers: subscribers.length,
        activeSubscriptions: 0,
        expiringSubscriptions: 0,
        expiredSubscriptions: 0,
        totalRevenue: 0,
        subscriptionTypes: {},
        paymentMethods: {},
        servicesPopularity: {}
    };
    
    subscribers.forEach(subscriber => {
        const status = calculateSubscriptionStatus(subscriber.startDate, subscriber.subscriptionType);
        
        if (status === 'active') stats.activeSubscriptions++;
        if (status === 'expiring') stats.expiringSubscriptions++;
        if (status === 'expired') stats.expiredSubscriptions++;
        
        stats.totalRevenue += subscriber.amount || 0;
        
        stats.subscriptionTypes[subscriber.subscriptionType] = 
            (stats.subscriptionTypes[subscriber.subscriptionType] || 0) + 1;
            
        stats.paymentMethods[subscriber.paymentMethod] = 
            (stats.paymentMethods[subscriber.paymentMethod] || 0) + 1;
            
        if (subscriber.services) {
            subscriber.services.forEach(service => {
                stats.servicesPopularity[service] = 
                    (stats.servicesPopularity[service] || 0) + 1;
            });
        }
    });
    
    return stats;
}

// Export Functions
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

function updateExportMetrics() {
    lastExportTime = new Date().toISOString();
    changesSinceExport = 0;
    saveToStorage();
    updateGitHubSyncStatus();
    updateDashboard();
}

function exportJSON() {
    const content = generateJSONExport();
    downloadFile(content, `subscribers_${getCurrentDateString()}.json`, 'application/json');
    updateExportMetrics();
    showMessage('JSON file exported successfully! Check your Downloads folder.', 'success');
}

function exportCSV() {
    const content = generateCSVExport();
    downloadFile(content, `subscribers_${getCurrentDateString()}.csv`, 'text/csv');
    updateExportMetrics();
    showMessage('CSV file exported successfully! Check your Downloads folder.', 'success');
}

function exportMarkdown() {
    const content = generateMarkdownExport();
    downloadFile(content, `SALON_DATA_${getCurrentDateString()}.md`, 'text/markdown');
    updateExportMetrics();
    showMessage('Markdown report exported successfully! Check your Downloads folder.', 'success');
}

function exportHTML() {
    const content = generateHTMLExport();
    downloadFile(content, `salon_dashboard_${getCurrentDateString()}.html`, 'text/html');
    updateExportMetrics();
    showMessage('HTML dashboard exported successfully! Check your Downloads folder.', 'success');
}

function exportSingleFormat(format) {
    switch (format) {
        case 'json':
            exportJSON();
            break;
        case 'csv':
            exportCSV();
            break;
        case 'markdown':
            exportMarkdown();
            break;
        case 'html':
            exportHTML();
            break;
    }
}

function exportAllFormats() {
    const modal = document.getElementById('githubExportModal');
    const progress = document.getElementById('exportProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const formatsGrid = document.getElementById('exportFormatsGrid');
    
    if (progress) progress.style.display = 'block';
    if (formatsGrid) formatsGrid.style.display = 'none';
    
    const formats = [
        { func: exportJSON, name: 'JSON Database', progress: 25 },
        { func: exportCSV, name: 'CSV File', progress: 50 },
        { func: exportMarkdown, name: 'Markdown Report', progress: 75 },
        { func: exportHTML, name: 'HTML Dashboard', progress: 100 }
    ];
    
    let currentFormat = 0;
    
    function exportNext() {
        if (currentFormat < formats.length) {
            const format = formats[currentFormat];
            if (progressText) progressText.textContent = `Generating ${format.name}...`;
            if (progressFill) progressFill.style.width = `${format.progress}%`;
            
            setTimeout(() => {
                format.func();
                currentFormat++;
                exportNext();
            }, 500);
        } else {
            if (progressText) progressText.textContent = 'All files exported successfully!';
            setTimeout(() => {
                closeGitHubExportModal();
                showMessage('All GitHub files exported successfully! Check your Downloads folder.', 'success');
            }, 1000);
        }
    }
    
    exportNext();
}

// Change Tracking Functions
function trackChange() {
    changesSinceExport++;
    saveToStorage();
    updateGitHubSyncStatus();
}

function checkForChanges() {
    const message = changesSinceExport > 0 
        ? `${changesSinceExport} changes detected since last export.`
        : 'No changes detected since last export.';
    
    showMessage(message, changesSinceExport > 0 ? 'warning' : 'success');
}

function generateChangeLog() {
    if (changesSinceExport === 0) {
        showMessage('No changes to log since last export.', 'info');
        return;
    }
    
    const changeLog = `# Change Log\n\n**Generated:** ${new Date().toLocaleDateString()}\n**Changes since last export:** ${changesSinceExport}\n\n## Summary\n\nChanges have been made to the subscriber database since the last GitHub export.\nPlease export the latest data to keep your GitHub repository synchronized.\n\n---\n*Generated by Elite Salon Management System*`;
    
    downloadFile(changeLog, `CHANGELOG_${getCurrentDateString()}.md`, 'text/markdown');
    showMessage('Change log generated and downloaded!', 'success');
}

function updateGitHubSyncStatus() {
    const lastExportEl = document.getElementById('lastExportTime');
    const changesSinceEl = document.getElementById('changesSinceExport');
    const lastBackupDateEl = document.getElementById('lastBackupDate');
    
    if (lastExportEl) {
        lastExportEl.textContent = lastExportTime ? formatDate(lastExportTime) : 'Never';
    }
    
    if (changesSinceEl) {
        changesSinceEl.textContent = changesSinceExport.toString();
    }
    
    if (lastBackupDateEl) {
        lastBackupDateEl.textContent = lastExportTime ? formatDate(lastExportTime) : 'Never';
    }
}

// GitHub Modal Functions
function openGitHubExportModal() {
    const modal = document.getElementById('githubExportModal');
    const progress = document.getElementById('exportProgress');
    const formatsGrid = document.getElementById('exportFormatsGrid');
    
    if (progress) progress.style.display = 'none';
    if (formatsGrid) formatsGrid.style.display = 'grid';
    if (modal) modal.classList.remove('hidden');
}

function closeGitHubExportModal() {
    const modal = document.getElementById('githubExportModal');
    if (modal) modal.classList.add('hidden');
}

// Copy Git Commands
function copyGitCommands() {
    const commands = document.getElementById('gitCommands');
    if (!commands) return;
    
    const text = commands.textContent.replace(/<br>/g, '\n');
    
    navigator.clipboard.writeText(text).then(() => {
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            const originalContent = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = originalContent;
            }, 2000);
        }
        showMessage('Git commands copied to clipboard!', 'success');
    }).catch(() => {
        showMessage('Failed to copy commands', 'error');
    });
}

// Backup Notifications
function showBackupNotification() {
    const notification = document.getElementById('backupNotification');
    if (notification && notification.classList.contains('hidden')) {
        notification.classList.remove('hidden');
        setTimeout(() => {
            if (!notification.classList.contains('hidden')) {
                dismissBackupNotification();
            }
        }, 10000);
    }
}

function dismissBackupNotification() {
    const notification = document.getElementById('backupNotification');
    if (notification) {
        notification.classList.add('hidden');
    }
}

// Dashboard Functions
function updateDashboard() {
    updateStats();
    setTimeout(updateChart, 100);
    updateRecentSubscribers();
    updateRenewalReminders();
    updateGitHubSyncStatus();
}

function updateStats() {
    const stats = generateStatistics();
    
    const totalSubEl = document.getElementById('totalSubscribers');
    const activeSubEl = document.getElementById('activeSubscriptions');
    const expiringSubEl = document.getElementById('expiringSubscriptions');
    
    if (totalSubEl) totalSubEl.textContent = stats.totalSubscribers;
    if (activeSubEl) activeSubEl.textContent = stats.activeSubscriptions;
    if (expiringSubEl) expiringSubEl.textContent = stats.expiringSubscriptions;
}

function updateChart() {
    const ctx = document.getElementById('subscriptionChart');
    if (!ctx) return;
    
    if (window.subscriptionChart) {
        window.subscriptionChart.destroy();
    }
    
    const stats = generateStatistics();
    const subscriptionTypes = stats.subscriptionTypes;
    
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
        .sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate))
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

// Table Functions
function updateSubscribersTable() {
    const tableBody = document.getElementById('subscribersTableBody');
    
    if (!tableBody) return;
    
    if (filteredSubscribers.length === 0 && subscribers.length > 0) {
        filteredSubscribers = [...subscribers];
    }
    
    sortSubscribers();
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredSubscribers.slice(startIndex, endIndex);
    
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
                            <button class="action-btn action-btn--edit" onclick="editSubscriber(${subscriber.id})" title="Edit">
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
    
    updatePagination();
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    paginationHTML += `
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
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

function sortSubscribers() {
    filteredSubscribers.sort((a, b) => {
        let aVal = a[currentSort.field];
        let bVal = b[currentSort.field];
        
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

// Search and Filter
function initSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('filterSubscriptionType');
    const statusFilter = document.getElementById('filterStatus');
    
    function applyFilters() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const typeFilterValue = typeFilter ? typeFilter.value : '';
        const statusFilterValue = statusFilter ? statusFilter.value : '';
        
        filteredSubscribers = subscribers.filter(subscriber => {
            const matchesSearch = !searchTerm || 
                subscriber.name.toLowerCase().includes(searchTerm) ||
                subscriber.phone.toLowerCase().includes(searchTerm) ||
                (subscriber.email && subscriber.email.toLowerCase().includes(searchTerm));
            
            const matchesType = !typeFilterValue || subscriber.subscriptionType === typeFilterValue;
            
            const status = calculateSubscriptionStatus(subscriber.startDate, subscriber.subscriptionType);
            const matchesStatus = !statusFilterValue || status === statusFilterValue;
            
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

// Simplified placeholder functions for other features
function updateReports() {
    console.log('Reports updated');
}

function updateSettingsTab() {
    console.log('Settings updated');
}

function editSubscriber(id) {
    showMessage('Edit feature will be implemented in full version', 'info');
}

function deleteSubscriber(id) {
    if (confirm('Are you sure you want to delete this subscriber?')) {
        subscribers = subscribers.filter(s => s.id !== id);
        filteredSubscribers = [...subscribers];
        trackChange();
        saveToStorage();
        updateSubscribersTable();
        updateDashboard();
        showMessage('Subscriber deleted successfully!', 'success');
    }
}

// Initialize Application
function init() {
    console.log('Initializing GitHub-enhanced salon management app...');
    
    // Load data from localStorage first
    loadFromStorage();
    filteredSubscribers = [...subscribers];
    
    // Initialize all components
    initTabNavigation();
    initAddSubscriber();
    initSearchAndFilter();
    initSorting();
    
    // Initial updates
    updateDashboard();
    updateSubscribersTable();
    updateGitHubSyncStatus();
    
    // Make functions globally available
    window.openGitHubExportModal = openGitHubExportModal;
    window.closeGitHubExportModal = closeGitHubExportModal;
    window.exportJSON = exportJSON;
    window.exportCSV = exportCSV;
    window.exportMarkdown = exportMarkdown;
    window.exportHTML = exportHTML;
    window.exportSingleFormat = exportSingleFormat;
    window.exportAllFormats = exportAllFormats;
    window.copyGitCommands = copyGitCommands;
    window.dismissBackupNotification = dismissBackupNotification;
    window.checkForChanges = checkForChanges;
    window.generateChangeLog = generateChangeLog;
    window.goToPage = goToPage;
    window.editSubscriber = editSubscriber;
    window.deleteSubscriber = deleteSubscriber;
    
    console.log(`Application initialized with ${subscribers.length} subscribers`);
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);