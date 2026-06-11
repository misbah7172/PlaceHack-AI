/**
 * PlaceHack AI — Minimalist Frontend Application
 */
import '../css/app.css';

// ─── State ───
let currentLocation = '';
let isGenerating = false;
const worldThemes = ['jungle', 'city', 'town', 'village', 'mine', 'coast'];
const themeLabels = {
    jungle: 'Untamed Canopy',
    city: 'Neon Metropolis',
    town: 'Forgotten District',
    village: 'Hearth & Field',
    mine: 'Depths of the Mountain',
    coast: 'Salt & Tide',
};

// ─── DOM Refs ───
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Loading Messages ───
const loadingMessages = [
    { title: 'Evaluating position...', msg: 'Initiating deep coordinate scanning' },
    { title: 'Records retrieval...', msg: 'Sifting database for historic milestones' },
    { title: 'Surveying terrain...', msg: 'Curating locations and local highlights' },
    { title: 'Cultural assessment...', msg: 'Synthesizing culinary and social profiles' },
    { title: 'Nearing completion...', msg: 'Assembling final geographical dossier' },
];

// ─── Theme Controls ───
function initWorldTheme() {
    setWorldTheme('city');

    document.addEventListener('pointermove', (event) => {
        document.documentElement.style.setProperty('--cursor-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--cursor-y', `${event.clientY}px`);
        spawnCursorPixel(event.clientX, event.clientY);
    });
}

function setWorldTheme(theme) {
    const nextTheme = worldThemes.includes(theme) ? theme : 'city';
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.dataset.themeLabel = themeLabels[nextTheme];
}

function themeFromReport(data, location) {
    const explicitTheme = data?.theme_context?.world_theme;
    if (worldThemes.includes(explicitTheme)) return explicitTheme;

    const haystack = [
        location,
        data?.title,
        data?.subtitle,
        data?.soul,
        ...(data?.must_visit || []).flatMap((item) => [item.name, item.category, item.description]),
        ...(data?.local_flavors || []).flatMap((item) => [item.title, item.type, item.description]),
    ].filter(Boolean).join(' ').toLowerCase();

    const scores = {
        coast: /(coast|port|harbo[u]?r|beach|sea|ocean|island|fishing|dock|lighthouse|bay|river mouth)/g,
        mine: /(mine|mining|coal|ore|quarry|mineral|steel|iron|copper|mountain settlement|industrial belt)/g,
        jungle: /(jungle|forest|rainforest|wildlife|canopy|sanctuary|national park|tribal forest|mangrove)/g,
        village: /(village|rural|farm|farming|agricultural|fields|pastoral|hamlet|countryside|paddy)/g,
        town: /(underdeveloped|old town|weathered|rust|neglected|industrial decline|forgotten|district|crumbling|informal settlement)/g,
        city: /(city|metro|metropolitan|downtown|skyscraper|urban|capital|financial|technology|airport|mall|expressway)/g,
    };

    let bestTheme = 'city';
    let bestScore = 0;
    for (const [theme, pattern] of Object.entries(scores)) {
        const score = haystack.match(pattern)?.length || 0;
        if (score > bestScore) {
            bestTheme = theme;
            bestScore = score;
        }
    }

    return bestTheme;
}

function spawnCursorPixel(x, y) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.documentElement.dataset.theme !== 'jungle') return;
    if (Math.random() > 0.35) return;

    const pixel = document.createElement('span');
    pixel.className = 'cursor-leaf';
    pixel.style.left = `${x}px`;
    pixel.style.top = `${y}px`;
    document.body.append(pixel);
    setTimeout(() => pixel.remove(), 800);
}

// ─── Contrast Mode ───
function initDarkMode() {
    const toggle = $('#darkModeToggle');
    const saved = localStorage.getItem('PlaceHack-dark-mode');

    if (saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }

    toggle?.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('PlaceHack-dark-mode', document.documentElement.classList.contains('dark'));
    });
}

function initMobileMenu() {
    const toggle = $('#mobileMenuToggle');
    const menu = $('#mobileMenu');
    const iconClosed = $('#mobileMenuIconClosed');
    const iconOpen = $('#mobileMenuIconOpen');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
        const isOpen = !menu.classList.contains('hidden');

        if (isOpen) {
            menu.classList.add('hidden');
            menu.style.maxHeight = '0';
            iconClosed.classList.remove('hidden');
            iconOpen.classList.add('hidden');
        } else {
            menu.classList.remove('hidden');
            // For smooth transition
            setTimeout(() => {
                menu.style.maxHeight = '300px';
            }, 10);
            iconClosed.classList.add('hidden');
            iconOpen.classList.remove('hidden');
        }
    });

    // Close menu on resize if screen becomes large
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) { // md breakpoint
            menu.classList.add('hidden');
            menu.style.maxHeight = '0';
            iconClosed.classList.remove('hidden');
            iconOpen.classList.add('hidden');
        }
    });
}

// ─── Toast Notifications ───
function showToast(message, type = 'info') {
    const toast = $('#toast');
    const icon = $('#toastIcon');
    const msg = $('#toastMessage');

    const icons = {
        success: { bg: 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border border-slate-200 dark:border-slate-800', svg: 'SUCCESS' },
        error: { bg: 'bg-rose-500 text-white', svg: 'ERROR' },
        info: { bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800', svg: 'INFO' },
    };

    const config = icons[type] || icons.info;
    icon.className = `px-2 py-0.5 rounded text-[9px] font-mono ${config.bg} font-bold`;
    icon.textContent = config.svg;
    msg.textContent = message;

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// ─── CSRF Token ───
function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
}

// ─── Geolocation ───
async function scanLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation unsupported by environment', 'error');
        return;
    }

    const btn = $('#scanLocationBtn');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Acquiring...';

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            });
        });

        const { latitude, longitude } = position.coords;

        // Reverse geocode
        const response = await fetch('/api/reverse-geocode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken(),
                'Accept': 'application/json',
            },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
        });

        const data = await response.json();

        if (data.success) {
            currentLocation = data.location;
            $('#locationInput').value = data.location;
            showToast(`Target acquired: ${data.location}`, 'success');
            generateReport(data.location);
        } else {
            showToast('Unable to determine location name', 'error');
        }
    } catch (error) {
        const messages = {
            1: 'Location permission denied.',
            2: 'Location data unavailable.',
            3: 'Location acquisition timed out.',
        };
        showToast(messages[error.code] || 'Detection failed', 'error');
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Scan Geolocation';
    }
}

// ─── Report Generation ───
async function generateReport(location, fresh = false) {
    if (isGenerating || !location.trim()) return;

    isGenerating = true;
    currentLocation = location.trim();

    // Show loading
    showLoadingState();

    // Cycle loading messages
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % loadingMessages.length;
        const msg = loadingMessages[msgIndex];
        const title = $('#loadingTitle');
        const text = $('#loadingMessage');
        if (title) title.textContent = msg.title;
        if (text) text.textContent = msg.msg;
    }, 3000);

    try {
        const response = await fetch('/api/generate-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken(),
                'Accept': 'application/json',
            },
            body: JSON.stringify({ location: currentLocation, fresh }),
        });

        const data = await response.json();
        clearInterval(msgInterval);

        if (data.success) {
            renderReport(data.data, data.location);
            showToast(
                data.cached ? 'Loaded from local database' : 'Analysis complete',
                'success'
            );
        } else {
            hideLoadingState();
            showToast(data.message || 'Analysis failed', 'error');
        }
    } catch (error) {
        clearInterval(msgInterval);
        hideLoadingState();
        showToast('Network error during analysis.', 'error');
        console.error('Analysis error:', error);
    } finally {
        isGenerating = false;
    }
}

// ─── Loading State ───
function showLoadingState() {
    $('#heroSection')?.classList.add('hidden');
    $('#reportSection')?.classList.add('hidden');
    const loading = $('#loadingSection');
    loading?.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Escape HTML ───
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── Report Rendering ───
function renderReport(data, location) {
    const reportTheme = themeFromReport(data, location);
    setWorldTheme(reportTheme);

    // Hide loading, show report
    $('#loadingSection')?.classList.add('hidden');
    const reportSection = $('#reportSection');
    reportSection?.classList.remove('hidden');

    // Hero details
    $('#reportTitle').textContent = data.title || 'Location Report';
    $('#reportSubtitle').textContent = data.subtitle || '';
    $('#reportLocation').textContent = location;
    const themeSituation = $('#themeSituation');
    if (themeSituation) {
        const situation = data.theme_context?.current_situation || `Visual world selected from location context: ${themeLabels[reportTheme]}.`;
        const reason = data.theme_context?.theme_reason ? ` ${data.theme_context.theme_reason}` : '';
        themeSituation.innerHTML = `<span>${escapeHtml(themeLabels[reportTheme])}</span> ${escapeHtml(situation + reason)}`;
    }

    // Soul
    const soulEl = $('#soulContent');
    if (soulEl && data.soul) {
        const paragraphs = data.soul.split('\n').filter(p => p.trim());
        soulEl.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    }
    const historyEl = $('#historyContent');
    if (historyEl && data.history) {
        historyEl.innerHTML = data.history.map((item, i) => `
            <div class="relative pl-2">
                <div class="absolute w-2.5 h-2.5 rounded-full bg-primary-500 left-[-21.5px] top-1.5 border-2 border-white dark:border-slate-900"></div>
                <div class="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
                    <span class="px-2 py-0.5 border border-slate-250 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 rounded text-xs font-mono uppercase text-slate-700 dark:text-slate-300 w-fit">
                        ${escapeHtml(item.year)}
                    </span>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">${escapeHtml(item.title)}</h3>
                </div>
                <p class="text-sm text-slate-650 dark:text-slate-400 font-light leading-relaxed mb-6">${escapeHtml(item.description)}</p>
            </div>
        `).join('');
    }

    // Must-Visit
    const mustVisitEl = $('#mustVisitContent');
    if (mustVisitEl && data.must_visit) {
        mustVisitEl.innerHTML = data.must_visit.map(spot => `
            <div class="py-5 first:pt-0 last:pb-0 border-b border-slate-200 dark:border-slate-800 last:border-none flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between gap-4 mb-2">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">${escapeHtml(spot.name)}</h3>
                        <span class="px-2 py-0.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-450 rounded">${escapeHtml(spot.category)}</span>
                    </div>
                    <p class="text-sm text-slate-600 dark:text-slate-400 font-light mb-3 leading-relaxed">${escapeHtml(spot.description)}</p>
                </div>
                <div class="bg-slate-100/50 dark:bg-slate-900/30 border-l-2 border-primary-500 pl-3 py-1.5">
                    <span class="text-[9px] font-mono uppercase tracking-wider text-primary-600 block mb-0.5 font-bold">Why Visit</span>
                    <p class="text-sm text-slate-700 dark:text-slate-355 font-light italic leading-relaxed">${escapeHtml(spot.why_visit)}</p>
                </div>
            </div>
        `).join('');
    }

    // Local Flavors
    const flavorsEl = $('#flavorsContent');
    if (flavorsEl && data.local_flavors) {
        flavorsEl.innerHTML = data.local_flavors.map(item => `
            <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-slate-50/20 dark:bg-slate-900/10 hover:border-primary-500 dark:hover:border-primary-800 transition-all duration-200">
                <div class="flex items-baseline justify-between gap-2 mb-2">
                    <span class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">${escapeHtml(item.title)}</span>
                    <span class="text-[9px] font-mono text-primary-600 uppercase tracking-widest font-bold">${escapeHtml(item.type)}</span>
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">${escapeHtml(item.description)}</p>
            </div>
        `).join('');
    }

    // Practical Tips (SVG icons mapping categories)
    const tipsEl = $('#tipsContent');
    if (tipsEl && data.practical_tips) {
        const tipIcons = {
            'timing': `<svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
            'etiquette': `<svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18V6.25c0-.621.504-1.125 1.125-1.125H9.75M10.5 2.25h3a.75.75 0 0 1 .75.75v.75H9.75V3a.75.75 0 0 1 .75-.75Z" /></svg>`,
            'budget': `<svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
            'safety': `<svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>`,
            'transport': `<svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.129-1.125V14.25M3 14.25h18M4.5 14.25l1.5-5.25a1.5 1.5 0 0 1 1.5-1.5h9a1.5 1.5 0 0 1 1.5 1.5l1.5 5.25M6 10.5h12" /></svg>`,
            'other': `<svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>`
        };

        tipsEl.innerHTML = data.practical_tips.map(item => {
            const category = (item.category || 'other').toLowerCase();
            const iconSvg = tipIcons[category] || tipIcons.other;
            return `
                <div class="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0 border-b border-slate-200 dark:border-slate-800 last:border-none">
                    <div class="shrink-0 w-8 h-8 rounded bg-primary-50 dark:bg-primary-950/35 text-primary-600 flex items-center justify-center">
                        ${iconSvg}
                    </div>
                    <div>
                        <span class="text-[9px] font-mono uppercase tracking-wider text-primary-600 block mb-0.5 font-bold">${escapeHtml(category)}</span>
                        <p class="text-sm text-slate-650 dark:text-slate-400 font-light leading-relaxed">${escapeHtml(item.tip)}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    const disastersEl = $('#disastersContent');
    if (disastersEl) {
        const incidents = data.historical_accidents_disasters || [];
        disastersEl.innerHTML = incidents.length ? incidents.map(incident => `
            <div class="incident-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-slate-50/20 dark:bg-slate-900/10 hover:border-primary-500 dark:hover:border-primary-800 transition-all duration-200">
                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <span class="px-2 py-0.5 border border-slate-250 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 rounded text-xs font-mono uppercase text-slate-700 dark:text-slate-300">${escapeHtml(incident.year || 'Unknown')}</span>
                    <span class="text-[9px] font-mono text-primary-600 uppercase tracking-widest font-bold">${escapeHtml(incident.type || 'Incident')}</span>
                </div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">${escapeHtml(incident.title || 'Historical Incident')}</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-3">${escapeHtml(incident.description || '')}</p>
                <div class="border-l-2 border-primary-500 pl-3">
                    <span class="text-[9px] font-mono uppercase tracking-wider text-primary-600 block mb-0.5 font-bold">Impact</span>
                    <p class="text-sm text-slate-700 dark:text-slate-355 font-light leading-relaxed">${escapeHtml(incident.impact || '')}</p>
                </div>
            </div>
        `).join('') : `
            <div class="incident-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-slate-50/20 dark:bg-slate-900/10">
                <p class="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">No major documented incidents were returned for this dossier.</p>
            </div>
        `;
    }

    // Fun Facts
    const factsEl = $('#factsContent');
    if (factsEl && data.fun_facts) {
        factsEl.innerHTML = data.fun_facts.map(fact => `
            <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-slate-50/20 dark:bg-slate-900/10 hover:border-primary-500 dark:hover:border-primary-800 transition-all duration-200 flex items-start gap-3">
                <span class="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0"></span>
                <p class="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">${escapeHtml(fact)}</p>
            </div>
        `).join('');
    }

    // Reveal animations
    requestAnimationFrame(() => {
        setTimeout(() => {
            $$('.report-section').forEach((el, i) => {
                setTimeout(() => el.classList.add('visible'), i * 100);
            });
        }, 50);
    });

    // Scroll to dashboard output
    setTimeout(() => {
        reportSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
}

// ─── PDF Export ───
function exportPdf() {
    if (!currentLocation) return;
    const url = `/api/export-pdf?location=${encodeURIComponent(currentLocation)}`;
    window.open(url, '_blank');
}

// ─── Reset / New ───
function newReport() {
    currentLocation = '';
    const input = $('#locationInput');
    if (input) input.value = '';
    $('#reportSection')?.classList.add('hidden');
    $('#heroSection')?.classList.remove('hidden');

    $$('.report-section').forEach(el => el.classList.remove('visible'));
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => $('#locationInput')?.focus(), 400);
}

// ─── Event Listeners ───
document.addEventListener('DOMContentLoaded', () => {
    initWorldTheme();
    initDarkMode();
    initMobileMenu();

    // Scan location
    $('#scanLocationBtn')?.addEventListener('click', scanLocation);

    // Manual form
    $('#manualForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const location = $('#locationInput')?.value?.trim();
        if (location) {
            generateReport(location);
        } else {
            showToast('Enter a valid query', 'info');
        }
    });

    // Regenerate
    $('#regenerateBtn')?.addEventListener('click', () => {
        if (currentLocation) {
            generateReport(currentLocation, true);
        }
    });

    // Export PDF
    $('#exportPdfBtn')?.addEventListener('click', exportPdf);

    // New report
    $('#newReportBtn')?.addEventListener('click', newReport);

    // Enter key
    $('#locationInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#manualForm')?.dispatchEvent(new Event('submit'));
        }
    });

    // History load
    const urlParams = new URLSearchParams(window.location.search);
    const loadReportId = urlParams.get('load_report_id');
    if (loadReportId) {
        loadReportFromHistory(loadReportId);
    }

    // History list items delete
    document.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-report-btn');
        if (!deleteBtn) return;

        const id = deleteBtn.getAttribute('data-delete-report-id');
        if (!id) return;

        if (!confirm('Confirm deletion of this intelligence dossier?')) return;

        deleteBtn.disabled = true;
        try {
            const response = await fetch(`/api/history/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'Accept': 'application/json',
                }
            });
            const data = await response.json();
            if (data.success) {
                showToast('Dossier deleted', 'success');
                const card = document.getElementById(`report-card-${id}`);
                if (card) {
                    card.classList.add('scale-95', 'opacity-0');
                    setTimeout(() => {
                        card.remove();
                        if ($$('.delete-report-btn').length === 0) {
                            window.location.reload();
                        }
                    }, 250);
                }
            } else {
                showToast(data.message || 'Deletion failed', 'error');
                deleteBtn.disabled = false;
            }
        } catch (error) {
            showToast('Error during deletion', 'error');
            deleteBtn.disabled = false;
            console.error(error);
        }
    });
});

async function loadReportFromHistory(id) {
    showLoadingState();
    try {
        const response = await fetch(`/api/history/${id}`, {
            headers: {
                'Accept': 'application/json',
            }
        });
        const data = await response.json();
        if (data.success) {
            currentLocation = data.location;
            const input = $('#locationInput');
            if (input) input.value = data.location;
            renderReport(data.data, data.location);
            showToast('Dossier retrieved', 'success');
        } else {
            hideLoadingState();
            showToast(data.message || 'Retrieval failed', 'error');
        }
    } catch (error) {
        hideLoadingState();
        showToast('Retrieval network error', 'error');
        console.error(error);
    }
}

function hideLoadingState() {
    $('#loadingSection')?.classList.add('hidden');
    $('#heroSection')?.classList.remove('hidden');
}
