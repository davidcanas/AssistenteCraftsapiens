import dotenv from 'dotenv';
import DGClient from './structures/Client';
import database from 'mongoose';
dotenv.config();

process.on('uncaughtException', (error) => {
	console.error(error);
});

process.on('unhandledRejection', (error) => {
	console.error(error);
});
database
	.connect(process.env.MONGODB as string)
	.then(() => console.log('A database foi iniciada com sucesso'));
const client = new DGClient(process.env.TOKEN);

client.loadCommands();
client.loadEvents();
client.connect();

require('./web/app');

export default client;
