// Curated meaningful projects (not simple applications or learning exercises)
const repositories = [
    {
        name: "kubernetes-manifest-generator",
        description: "Svelte web application for generating Kubernetes RBAC manifests with intuitive interface",
        language: "Svelte",
        category: "devops",
        tags: ["Kubernetes", "RBAC", "Web App"],
        url: "https://github.com/nimishgj/kubernetes-manifest-generator",
        updated: "2025-07-10"
    },
    {
        name: "otel-collector-contrib-config",
        description: "Production-ready OpenTelemetry Collector configurations with comprehensive examples",
        language: "YAML",
        category: "devops",
        tags: ["OpenTelemetry", "Observability", "Configuration"],
        url: "https://github.com/nimishgj/otel-collector-contrib-config",
        updated: "2025-06-25"
    },
    {
        name: "helm-charts",
        description: "Custom Helm charts for Kubernetes deployments and applications",
        language: "Smarty",
        category: "devops",
        tags: ["Helm", "Kubernetes", "Charts"],
        url: "https://github.com/nimishgj/helm-charts",
        updated: "2025-08-09"
    },
    {
        name: "terraform-aws-organization",
        description: "Terraform modules for AWS Organizations setup and management",
        language: "HCL",
        category: "devops",
        tags: ["Terraform", "AWS", "IaC"],
        url: "https://github.com/nimishgj/terraform-aws-organization",
        updated: "2024-11-20"
    },
    {
        name: "network-boot-raspberry-pi",
        description: "PXE boot infrastructure for Raspberry Pi network booting and management",
        language: "Shell",
        category: "devops",
        tags: ["Raspberry Pi", "PXE", "Network Boot"],
        url: "https://github.com/nimishgj/network-boot-raspberry-pi",
        updated: "2025-05-14"
    },
    {
        name: "cmds-lite",
        description: "Linux commands reimplemented in Rust for understanding system internals",
        language: "Rust",
        category: "tools",
        tags: ["Rust", "CLI", "System Tools"],
        url: "https://github.com/nimishgj/cmds-lite",
        updated: "2025-05-20"
    },
    {
        name: "atuin-lite",
        description: "Lightweight shell history management tool using fzf",
        language: "Shell",
        category: "tools",
        tags: ["CLI", "Shell", "History"],
        url: "https://github.com/nimishgj/atuin-lite",
        updated: "2025-05-14"
    },
    {
        name: "tmi",
        description: "Minimal tmux session/window manager with YAML configuration",
        language: "Shell",
        category: "tools",
        tags: ["Tmux", "Session Manager", "YAML"],
        url: "https://github.com/nimishgj/tmi",
        updated: "2025-05-14"
    },
    {
        name: "cpbrd",
        description: "CLI Clipboard Manager tool for enhanced developer productivity",
        language: "Shell",
        category: "tools",
        tags: ["CLI", "Clipboard", "Productivity"],
        url: "https://github.com/nimishgj/cpbrd",
        updated: "2025-05-14"
    },
    {
        name: "terminal-portfolio",
        description: "Interactive terminal-style portfolio website with dynamic features",
        language: "TypeScript",
        category: "web",
        tags: ["Portfolio", "Terminal", "TypeScript"],
        url: "https://github.com/nimishgj/terminal-portfolio",
        updated: "2025-05-14"
    },
];

// DOM elements
const projectsGrid = document.getElementById('projects-grid');
const filterButtons = document.querySelectorAll('.filter-btn');

// Initialize the portfolio
document.addEventListener('DOMContentLoaded', function() {
    renderProjects('all');
    setupFilterButtons();
    addScrollAnimations();
    // initializeThemeToggle(); // Moved to individual page scripts
});

// Render projects based on filter
function renderProjects(filter) {
    const filteredRepos = filter === 'all' 
        ? repositories 
        : repositories.filter(repo => repo.category === filter);
    
    projectsGrid.innerHTML = '';
    
    filteredRepos.forEach((repo, index) => {
        const projectCard = createProjectCard(repo);
        projectsGrid.appendChild(projectCard);
        
        // Add staggered animation
        setTimeout(() => {
            projectCard.style.opacity = '1';
            projectCard.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Create project card HTML
function createProjectCard(repo) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.5s ease';
    
    const languageColor = getLanguageColor(repo.language);
    
    card.innerHTML = `
        <div class="project-header">
            <a href="${repo.url}" target="_blank" class="project-name">${repo.name}</a>
            ${repo.language ? `<span class="project-language" style="background-color: ${languageColor}20; color: ${languageColor}">${repo.language}</span>` : ''}
        </div>
        <div class="project-description">
            ${repo.description || 'No description available'}
        </div>
        <div class="project-stats">
            <div class="project-tags">
                ${repo.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
            </div>
        </div>
        ${repo.stars ? `<div class="project-stars">⭐ ${repo.stars}</div>` : ''}
    `;
    
    return card;
}

// Setup filter button functionality
function setupFilterButtons() {
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filter projects
            const filter = button.getAttribute('data-filter');
            renderProjects(filter);
        });
    });
}

// Get language-specific colors
function getLanguageColor(language) {
    const colors = {
        'JavaScript': '#f7df1e',
        'TypeScript': '#3178c6',
        'Go': '#00add8',
        'Python': '#3776ab',
        'Rust': '#ce422b',
        'Shell': '#89e051',
        'Java': '#f89820',
        'Svelte': '#ff3e00',
        'HTML': '#e34f26',
        'CSS': '#1572b6',
        'PHP': '#777bb4',
        'HCL': '#844fba',
        'Smarty': '#ffc61c',
        'YAML': '#cb171e',
        'Jupyter Notebook': '#da5b0b',
        'C': '#555555'
    };
    return colors[language] || '#888888';
}


// Add scroll animations
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all sections
    const sections = document.querySelectorAll('.about-section, .skills-section, .projects-section, .contact-section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'all 0.6s ease';
        observer.observe(section);
    });
}

// Add terminal-like typing effect
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add interactive terminal cursor
function addTerminalCursor() {
    const cursor = document.querySelector('.cursor');
    if (cursor) {
        setInterval(() => {
            cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
        }, 500);
    }
}

// Initialize cursor animation
addTerminalCursor();

// Analytics for project clicks (if needed)
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('project-name')) {
        const projectName = e.target.textContent;
        console.log(`Clicked on project: ${projectName}`);
        // Add analytics tracking here if needed
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K to focus on filter buttons
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const firstFilterBtn = document.querySelector('.filter-btn');
        if (firstFilterBtn) firstFilterBtn.focus();
    }
});

// Performance optimization: Lazy load project images if any
const projectCards = document.querySelectorAll('.project-card');
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('loaded');
            cardObserver.unobserve(entry.target);
        }
    });
});

projectCards.forEach(card => {
    cardObserver.observe(card);
});

// Theme Toggle Functionality
function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.querySelector('.theme-icon');
    const html = document.documentElement;
    const body = document.body;
    
    // Check for saved theme preference or default to dark mode
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    
    // Theme toggle click handler
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
            localStorage.setItem('theme', newTheme);
            console.log('Theme switched to:', newTheme); // Debug log
        });
    }
    
    function setTheme(theme) {
        if (theme === 'light') {
            html.setAttribute('data-theme', 'light');
            body.setAttribute('data-theme', 'light');
            if (themeIcon) {
                themeIcon.textContent = '☀️';
            }
        } else {
            html.removeAttribute('data-theme');
            body.removeAttribute('data-theme');
            if (themeIcon) {
                themeIcon.textContent = '🌙';
            }
        }
        console.log('Theme set to:', theme); // Debug log
    }
}