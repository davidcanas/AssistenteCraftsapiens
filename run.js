const { exec } = require('child_process');

const bot = exec('yarn dev');

bot.stdin.on('data', (data) => {
	console.log(data);
});

bot.stdout.on('data', (data) => {
	console.log(data);
});

bot.stderr.on('data', (data) => {
	console.log(data);
});

