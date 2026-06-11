import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const dataFile = path.join(dataDir, 'placehack.json');

function now() {
    return new Date().toISOString();
}

function ensureDataFile() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, JSON.stringify({ users: [], reports: [], counters: { users: 0, reports: 0 } }, null, 2));
    }
}

function readData() {
    ensureDataFile();
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeData(data) {
    ensureDataFile();
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function withoutPassword(user) {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
}

export const store = {
    findUserById(id) {
        const data = readData();
        return withoutPassword(data.users.find((user) => user.id === Number(id)));
    },

    findUserByEmail(email) {
        const data = readData();
        return data.users.find((user) => user.email === String(email).toLowerCase()) || null;
    },

    createUser({ name, email, passwordHash }) {
        const data = readData();
        const user = {
            id: data.counters.users + 1,
            name,
            email: email.toLowerCase(),
            passwordHash,
            createdAt: now(),
            updatedAt: now(),
        };
        data.counters.users = user.id;
        data.users.push(user);
        writeData(data);
        return withoutPassword(user);
    },

    createReport({ userId, locationQuery, locationDisplay, reportData }) {
        const data = readData();
        const report = {
            id: data.counters.reports + 1,
            userId: userId ? Number(userId) : null,
            locationQuery,
            locationDisplay,
            reportData,
            createdAt: now(),
            updatedAt: now(),
        };
        data.counters.reports = report.id;
        data.reports.push(report);
        writeData(data);
        return report;
    },

    findLatestReportByQuery(locationQuery, preferredUserId = null) {
        const data = readData();
        const matches = data.reports
            .filter((report) => report.locationQuery === locationQuery)
            .sort((a, b) => {
                if (preferredUserId) {
                    if (a.userId === preferredUserId && b.userId !== preferredUserId) return -1;
                    if (b.userId === preferredUserId && a.userId !== preferredUserId) return 1;
                }
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

        return matches[0] || null;
    },

    reportsForUser(userId) {
        const data = readData();
        return data.reports
            .filter((report) => report.userId === Number(userId))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    findUserReport(userId, reportId) {
        const data = readData();
        return data.reports.find((report) => report.userId === Number(userId) && report.id === Number(reportId)) || null;
    },

    deleteUserReport(userId, reportId) {
        const data = readData();
        const initialLength = data.reports.length;
        data.reports = data.reports.filter((report) => !(report.userId === Number(userId) && report.id === Number(reportId)));
        if (data.reports.length === initialLength) return false;
        writeData(data);
        return true;
    },
};