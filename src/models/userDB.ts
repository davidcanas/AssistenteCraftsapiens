import { Schema, model, Document } from 'mongoose';

interface userDB extends Document {
    nick: string;
    punicoes: Array<object>;
}

const userDB: Schema = new Schema(
    {
        nick: {
            type: String,
            required: true,
        },

        punicoes: {
            type: Array,
            required: false,
        },

    },
    {
        versionKey: false,
    },
);

export default model<userDB>('user', userDB);
