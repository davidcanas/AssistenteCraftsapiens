import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export default class askGPT extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'ask',
            description: 'Faça uma questão ao assistente',
            category: 'Util',
            aliases: ['askgpt', 'gpt'],
            options: [
                {
                    type: 3,
                    name: 'pergunta',
                    description: 'A pergunta a fazer ao assistente',
                    required: true
                }
            ],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        
        await ctx.defer();
        
        if(!ctx.args[0]) {
            ctx.args[0] = '[mencionou]';
        }

        const db = await this.client.db.staff.find({});
        const staffs = db.map((staff) => `(${staff.role}) ${staff.nick}`).join('; ');

        const linksUteis = [
            { name: 'Site oficial da craftsapiens', value: 'https://craftsapiens.com.br' },
            { name: 'Loja da craftsapiens (apenas dá para comprar premium,vip, ou sapiens)', value: 'https://craftsapiens.lojasquare.net' },
            { name: 'Mapa', value: 'http://jogar.craftsapiens.com.br:50024/mapa' },
            { name: 'Código do Assistente (github)', value: 'https://github.com/davidcanas/AssistenteCraftsapiens' }
        ];
        const usefulLinks = linksUteis.map(link => `${link.name} - ${link.value}`).join(', ');

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GPT_KEY}`
        };

        const systemMessagesPath = path.resolve(__dirname, '../../data/system_context.txt');
        const systemMessages = fs.readFileSync(systemMessagesPath, 'utf-8').split('\n').filter(line => line.trim());

        const townyDocsPath = path.resolve(__dirname, '../../data/towny_docs.txt');
        const townyDocsMessages = fs.readFileSync(townyDocsPath, 'utf-8').split('\n').filter(line => line.trim());

        const timestamp = new Date().toISOString();
        const messages = systemMessages.map(content => ({
            role: 'system',
            content: content
                .replace('{member_name}', ctx.member.nick || ctx.member.user.globalName)
                .replace('{member_role}', this.client.getHighestRole(ctx.guild, ctx.member.id))
                .replace('{channel_id}', ctx.channel.id)
                .replace('{channel_category}', ctx.channel.parent?.name || 'Sem categoria')
                .replace('{staffs}', staffs)
                .replace('{useful_links}', usefulLinks)
                .replace('{timestamp}', timestamp)
        }));

        messages.push({role: 'system', content: townyDocsMessages.join('\n')});
        console.log(ctx.args.join(' '));
        messages.push({ role: 'user', content: ctx.args.join(' ') });
        
        const data = {
            'model': 'gpt-4o',
            'messages': messages,
            'max_tokens': 500,
            'temperature': 0.6
        };

        const response = await fetch(process.env.GPT_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        const json = await response.json();
        console.log(json);
        console.log(json.choices[0].message);
        
        
        if (json.choices[0].message.content.includes('timeout_member')) {
            ctx.member.edit({ communicationDisabledUntil: new Date(Date.now() + 3600000).toISOString() });
            json.choices[0].message.content.replace('[timeout_member]', ' ');
        }
        
        const embed = new this.client.embed()
            .setColor('RANDOM')
            .setDescription(json.choices[0].message.content);
        ctx.sendMessage({ embeds: [embed] });
    }
}
