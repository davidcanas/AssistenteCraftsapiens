import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { AutocompleteInteraction } from "oceanic.js";

export default class noAulaClass extends Command {
    constructor(client: Client) {
        super(client, {
            name: "whitelisturl",
            description: "Gerencia a whitelist de urls do bot",
            category: "DG",
            aliases: [],
            options: [
                {
                    name: "add",
                    description: "Adiciona um URL na whitelist",
                    type: 1,
                    options: [{
                        type: 3,
                        name: 'dominio',
                        description: 'Domínio que deseja adicionar da whitelist (Exemplo: google.com)', 
                        required: true
        
                    }]
                },
                {
                    name: "remove",
                    description: "Remove um URL da whitelist",
                    autocomplete: true,
                    type: 1,
                    options:[{
                        type: 3,
                        name: 'dominio',
                        description: 'Domínio que deseja remover da whitelist (Exemplo: google.com)',
                        autocomplete: true, 
                        required: true
        
                    }]
                },
                {
                    name: "list",
                    description: "Lista todos os URLs na whitelist",
                    type: 1,
                    options: []
                }
            ],

        });
    }

    async execute(ctx: CommandContext): Promise<void> {
       
        if (!this.client.allowedUsers.includes(ctx.author.id)) {
            ctx.sendMessage({
                content: "Você não tem acesso a esse comando!",
                flags: 1 << 6,
            });
            return;
        }

        if (ctx.args[0] === "add") {
           const domain = ctx.args[1]
              if (!domain || !domain.includes(".") || domain.includes("http") || domain.length < 4) {
                ctx.sendMessage("Você precisa informar um domínio válido para adicionar")
                return
              }
              const db = await this.client.db.global.findOne({id: ctx.guild.id})

                if (!db) {
                    ctx.sendMessage("Erro ao buscar o banco de dados")
                    return
                }

                if (db.whitelistedUrl.includes(domain)) {
                    ctx.sendMessage("Esse domínio já está na whitelist")
                    return
                }

                db.whitelistedUrl.push(domain)
                db.save()

                ctx.sendMessage("✅ **Sucesso!** Domínio `" + domain + "` adicionado na whitelist")

        } else if (ctx.args[0] === "remove") {
            const domain = ctx.args[1]
            if (!domain || !domain.includes(".") || domain.includes("http") || domain.length < 4) {
                ctx.sendMessage("Você precisa informar um domínio válido para remover")
                return
            }
            const db = await this.client.db.global.findOne({id: ctx.guild.id})

            if (!db) {
                ctx.sendMessage("Erro ao buscar o banco de dados")
                return
            }

            if (!db.whitelistedUrl.includes(domain)) {
                ctx.sendMessage("Esse domínio não está na whitelist")
                return
            }

            db.whitelistedUrl = db.whitelistedUrl.filter((d) => d !== domain)
            db.save()

            ctx.sendMessage("✅ **Sucesso!** Domínio `" + domain + "` removido da whitelist")

        } else if (ctx.args[0] === "list") {
            const db = await this.client.db.global.findOne({id: ctx.guild.id})

            if (!db) {
                ctx.sendMessage("Erro ao buscar o banco de dados")
                return
            }

            if (db.whitelistedUrl.length === 0) {
                ctx.sendMessage("Não há domínios na whitelist")
                return
            }
            const embed = new this.client.embed()
            .setTitle("<:diamante:905024266880315412> Lista de domínios na whitelist")
            .setDescription(db.whitelistedUrl.map((d) => `• \`${d}\``).join("\n"))
            .setColor("RANDOM")
            ctx.sendMessage({embeds: [embed]})
            

        }


        


    }
    
}