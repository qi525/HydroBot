import { readFileSync, writeFileSync } from 'fs-extra';

const tasks: [string, number, ...string[][]][] = [
    [
        'koishi-core/dist/command', 1,
        [
            'append', 'throw error;',
            `if (typeof error === 'string'){
                session.$user.usage[argv.command.name]--;
                return session.$send(error);
            }
            session.$send(error.message);`,
        ],
    ],
    [
        'koishi-plugin-mongo', 2,
        [
            'replaceBetween',
            'async setUser(userId, data) {',
            'async getGroup(groupId, ...args) {',
            `\
        const $set = { ...data };
        delete $set.timers;
        delete $set.usage;
        if (data.timers) {
            $set.timers = {};
            for (const key in data.timers) {
                if (key === '$date') $set.timer._date = data.timers.$date;
                else $set.timer[key.replace(/\\./gmi, '_')] = data.timers[key];
            }
        }
        if (data.usage) {
            $set.usage = {};
            for (const key in data.usage) {
                if (key === '$date') $set.usage._date = data.usage.$date;
                else $set.usage[key.replace(/\\./gmi, '_')] = data.usage[key];
            }
        }
        await this.user.updateOne({ _id: userId }, { $set }, { upsert: true });
    },`,
        ],
    ],
];

async function hack() {
    for (const [filename, version, ...changes] of tasks) {
        const file = require.resolve(filename);
        if (!file) console.warn(`Unable to hack ${filename}: file not found`);
        let content = readFileSync(file).toString();
        const first = content.split('\n')[0];
        const ver = parseInt(first.split('// Hacked v')[1], 10);
        if (ver >= version) continue;
        for (const [type, arg0, arg1, arg2] of changes) {
            if (type === 'replace') {
                content = content.replace(arg0, arg1);
            } else if (type === 'replaceBetween') {
                const [before, mid] = content.split(arg0);
                const [, after] = mid.split(arg1);
                content = before + arg0 + arg2 + arg1 + after;
            } else if (type === 'append') {
                content = content.replace(arg0, arg0 + arg1);
            } else if (type === 'remove') {
                content = content.replace(arg0, '');
            }
        }
        content = `// Hacked v${version}\n${content}`;
        writeFileSync(file, content);
    }
}

export = hack;

if (!module.parent) hack();