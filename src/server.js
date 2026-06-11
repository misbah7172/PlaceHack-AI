import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import sessionFileStore from 'session-file-store';
import bcrypt from 'bcryptjs';
import PDFDocument from 'pdfkit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { store } from './store.js';
import { generateLocationReport } from './services/openaiReportService.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const FileStore = sessionFileStore(session);

app.set('view engine', 'ejs');
app.set('views', path.join(rootDir, 'views'));
app.disable('x-powered-by');

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(rootDir, 'public')));
app.use('/resources', express.static(path.join(rootDir, 'resources')));
app.use(session({
    store: new FileStore({
        path: path.join(rootDir, 'data', 'sessions'),
        retries: 0,
    }),
    name: 'placehack.sid',
    secret: process.env.SESSION_SECRET || 'placehack-local-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 1000 * 60 * 60 * 24 * 7,
    },
}));

app.use((req, res, next) => {
    const user = req.session.userId ? store.findUserById(req.session.userId) : null;
    req.user = user;
    res.locals.user = user;
    res.locals.year = new Date().getFullYear();
    res.locals.vite = viteTags;
    next();
});

function viteTags() {
    if (!isProduction) {
        const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        return `
            <script type="module" src="${devUrl}/@vite/client"></script>
            <script type="module" src="${devUrl}/resources/js/app.js"></script>
        `;
    }

    try {
        const manifest = require(path.join(rootDir, 'public/build/.vite/manifest.json'));
        const entry = manifest['resources/js/app.js'];
        const cssTags = (entry.css || []).map((file) => `<link rel="stylesheet" href="/build/${file}">`).join('\n');
        return `${cssTags}\n<script type="module" src="/build/${entry.file}"></script>`;
    } catch {
        return '<script type="module" src="/resources/js/app.js"></script>';
    }
}

function requireGuest(req, res, next) {
    if (req.user) return res.redirect('/');
    next();
}

function requireAuth(req, res, next) {
    if (!req.user) return res.redirect('/login');
    next();
}

function normalizeLocation(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function slugify(value) {
    return String(value || 'location')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'location';
}

function formatReverseGeocodeLocation(address = {}, displayName = '') {
    const district = address.state_district || address.district || address.county;
    const country = address.country;

    if (district && country) return `${district}, ${country}`;
    if (country) return country;

    if (displayName) {
        const segments = displayName.split(',').map((segment) => segment.trim()).filter((segment) => segment && !/^\d+$/.test(segment));
        const districtSegment = segments.find((segment) => /\b(district|county)\b/i.test(segment));
        const countrySegment = segments.at(-1);
        if (districtSegment && countrySegment && districtSegment !== countrySegment) return `${districtSegment}, ${countrySegment}`;
        if (countrySegment) return countrySegment;
    }

    return 'Unknown Location';
}

app.get('/', (req, res) => res.render('home'));

app.get('/login', requireGuest, (req, res) => {
    res.render('auth/login', { errors: [], old: {} });
});

app.post('/login', requireGuest, async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = store.findUserByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(422).render('auth/login', {
            errors: ['The provided credentials do not match our records.'],
            old: { email },
        });
    }

    req.session.userId = user.id;
    res.redirect('/');
});

app.get('/register', requireGuest, (req, res) => {
    res.render('auth/register', { errors: [], old: {} });
});

app.post('/register', requireGuest, async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const passwordConfirmation = String(req.body.password_confirmation || '');
    const errors = [];

    if (!name) errors.push('Name is required.');
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.push('A valid email address is required.');
    if (store.findUserByEmail(email)) errors.push('That email is already registered.');
    if (password.length < 8) errors.push('Password must be at least 8 characters.');
    if (password !== passwordConfirmation) errors.push('Password confirmation does not match.');

    if (errors.length) {
        return res.status(422).render('auth/register', { errors, old: { name, email } });
    }

    const user = store.createUser({
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
    });

    req.session.userId = user.id;
    res.redirect('/');
});

app.post('/logout', requireAuth, (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

app.get('/history', requireAuth, (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const perPage = 12;
    const allReports = store.reportsForUser(req.user.id);
    const totalPages = Math.max(Math.ceil(allReports.length / perPage), 1);
    const reports = allReports.slice((page - 1) * perPage, page * perPage);

    res.render('history', { reports, page, totalPages });
});

app.get('/api/history/:id', requireAuth, (req, res) => {
    const report = store.findUserReport(req.user.id, req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });
    res.json({ success: true, data: report.reportData, location: report.locationDisplay });
});

app.delete('/api/history/:id', requireAuth, (req, res) => {
    const deleted = store.deleteUserReport(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Report not found.' });
    res.json({ success: true, message: 'Report deleted successfully.' });
});

app.post('/api/reverse-geocode', async (req, res) => {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
        return res.status(422).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }

    try {
        const url = new URL('https://nominatim.openstreetmap.org/reverse');
        url.search = new URLSearchParams({
            lat: String(lat),
            lon: String(lng),
            format: 'json',
            addressdetails: '1',
            'accept-language': 'en',
            zoom: '16',
        });

        const response = await fetch(url, {
            headers: { 'User-Agent': 'PlaceHackAI/1.0', 'Accept-Language': 'en' },
        });

        if (!response.ok) {
            return res.status(422).json({ success: false, message: 'Could not determine location from coordinates.' });
        }

        const data = await response.json();
        const location = formatReverseGeocodeLocation(data.address, data.display_name);
        res.json({ success: true, location, display_name: data.display_name || location });
    } catch {
        res.status(503).json({ success: false, message: 'Geocoding service unavailable.' });
    }
});

app.post('/api/generate-report', async (req, res) => {
    const location = String(req.body.location || '').trim();
    const fresh = Boolean(req.body.fresh);
    const normalizedQuery = normalizeLocation(location);

    if (!location || location.length > 255) {
        return res.status(422).json({ success: false, message: 'A valid location is required.' });
    }

    if (!fresh) {
        const cached = store.findLatestReportByQuery(normalizedQuery, req.user?.id);
        if (cached) {
            if (req.user && cached.userId !== req.user.id) {
                store.createReport({
                    userId: req.user.id,
                    locationQuery: normalizedQuery,
                    locationDisplay: cached.locationDisplay,
                    reportData: cached.reportData,
                });
            }

            return res.json({ success: true, cached: true, data: cached.reportData, location: cached.locationDisplay });
        }
    }

    try {
        const reportData = await generateLocationReport(location);
        store.createReport({
            userId: req.user?.id || null,
            locationQuery: normalizedQuery,
            locationDisplay: location,
            reportData,
        });

        res.json({ success: true, cached: false, data: reportData, location });
    } catch (error) {
        console.error('OpenAI report generation failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate report. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});

app.get('/api/export-pdf', (req, res) => {
    const normalizedQuery = normalizeLocation(req.query.location);
    const report = store.findLatestReportByQuery(normalizedQuery, req.user?.id);
    if (!report) return res.status(404).send('Report not found. Generate a report first.');

    const filename = `${slugify(report.locationDisplay)}-PlaceHack-report.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 54, size: 'A4' });
    doc.pipe(res);

    writePdf(doc, report.reportData, report.locationDisplay);
    doc.end();
});

function writePdf(doc, report, location) {
    const section = (title) => {
        doc.moveDown(1.3).fontSize(10).fillColor('#4f46e5').text(title.toUpperCase(), { characterSpacing: 1.2 });
        doc.moveTo(doc.x, doc.y + 4).lineTo(540, doc.y + 4).strokeColor('#cbd5e1').stroke().moveDown(0.8);
        doc.fillColor('#1e293b');
    };

    doc.fontSize(9).fillColor('#4f46e5').text('PLACEHACK INTELLIGENCE DOSSIER', { characterSpacing: 1.5 });
    doc.moveDown(0.5).fontSize(24).fillColor('#0f172a').text(report.title || 'Location Report');
    doc.fontSize(11).fillColor('#64748b').text(report.subtitle || '');
    doc.moveDown(0.5).fontSize(9).fillColor('#334155').text(`Target Location: ${location}`);

    if (report.theme_context?.current_situation) {
        doc.moveDown(0.5).fontSize(9).fillColor('#334155').text(`Current Situation: ${report.theme_context.current_situation}`);
    }

    section('Contextual Narrative');
    doc.fontSize(10).fillColor('#334155').text(report.soul || '', { lineGap: 3 });

    section('Chronological Milestones');
    for (const item of report.history || []) {
        doc.fontSize(9).fillColor('#4f46e5').text(item.year || '', { continued: true }).fillColor('#0f172a').text(`  ${item.title || ''}`);
        doc.fontSize(9).fillColor('#475569').text(item.description || '', { lineGap: 2 }).moveDown(0.5);
    }

    section('Curated Points of Interest');
    for (const spot of report.must_visit || []) {
        doc.fontSize(10).fillColor('#0f172a').text(`${spot.name || ''} (${spot.category || 'Place'})`);
        doc.fontSize(9).fillColor('#475569').text(spot.description || '');
        doc.fontSize(9).fillColor('#334155').text(`Why visit: ${spot.why_visit || ''}`).moveDown(0.5);
    }

    section('Cultural & Flavor Profiles');
    for (const item of report.local_flavors || []) {
        doc.fontSize(10).fillColor('#0f172a').text(`${item.title || ''} (${item.type || 'Local'})`);
        doc.fontSize(9).fillColor('#475569').text(item.description || '').moveDown(0.5);
    }

    section('Operational Guidelines');
    for (const tip of report.practical_tips || []) {
        doc.fontSize(9).fillColor('#4f46e5').text(tip.category || 'General', { continued: true }).fillColor('#334155').text(`: ${tip.tip || ''}`).moveDown(0.3);
    }

    section('Historical Accidents & Disasters');
    for (const incident of report.historical_accidents_disasters || []) {
        doc.fontSize(10).fillColor('#0f172a').text(`${incident.year || ''} - ${incident.title || 'Incident'} (${incident.type || 'Event'})`);
        doc.fontSize(9).fillColor('#475569').text(incident.description || '', { lineGap: 2 });
        doc.fontSize(9).fillColor('#334155').text(`Impact: ${incident.impact || ''}`).moveDown(0.5);
    }

    section('Trivia Matrix');
    for (const fact of report.fun_facts || []) {
        doc.fontSize(9).fillColor('#334155').text(`- ${fact}`, { lineGap: 2 });
    }

    doc.moveDown(1.5).fontSize(8).fillColor('#94a3b8').text(`Generated via PlaceHack Engine - ${new Date().toLocaleDateString('en-US')} - Created by Mighty`, { align: 'center' });
}

app.use((req, res) => {
    res.status(404).render('error', { title: 'Not Found', message: 'The requested page could not be found.' });
});

app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).render('error', { title: 'Server Error', message: 'Something went wrong.' });
});

app.listen(port, () => {
    console.log(`PlaceHack AI Node server running at http://localhost:${port}`);
});