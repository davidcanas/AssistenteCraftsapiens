module.exports = class Interaction {
    constructor(client, name, options = {}) {
        this.client = client
        this.name = options.name || name
        this.description = options.description || 'Sem descrição'
        this.options = options.options || []
    }

    async run() {
        throw new Error(
            'Meu programador é um horrivel e não me programou direito ;/'
        )
    }
}
