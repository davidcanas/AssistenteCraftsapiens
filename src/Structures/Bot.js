const {Client} = require('eris')
const Utils = require('./BotUtils.js')

module.exports = class BotClient extends Client {
    constructor(options = {}) {
        super(options.token, {restMode: true, intents: ['all']})

        this.validate(options)

        this.interactions = new Map()
        this.devMode = true
        this.events = new Map()
        this.utils = new Utils(this)
    }

    validate(options) {
        if (typeof options !== 'object') {
            throw new TypeError('Options should be a type of Object.')
        }

        this.token = options.token
        this.prefix = options.prefix
        this.developers = options.developers
        this.devMode = options.devmode
    }

    async connect() {
        this.utils
            .loadEvents()
            .then(
                console.log(
                    '\u001b[32m', '[ASSISTENTE_CRAFTSAPIENS] - Eventos carregados com sucesso!'
                )
            )
            .catch(console.error)

        await super.connect()
    }
}
