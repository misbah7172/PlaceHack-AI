import { spawn } from 'node:child_process';

const commands = [
    { name: 'server', command: 'node', args: ['src/server.js'] },
    { name: 'vite', command: 'npx', args: ['vite', '--host', '0.0.0.0'] },
];

const children = commands.map(({ name, command, args }) => {
    const child = spawn(command, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
    });

    child.on('exit', (code) => {
        if (code && !shuttingDown) {
            console.error(`${name} exited with code ${code}`);
            shutdown(code);
        }
    });

    return child;
});

let shuttingDown = false;

function shutdown(code = 0) {
    shuttingDown = true;
    for (const child of children) {
        if (!child.killed) child.kill();
    }
    process.exit(code);
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());