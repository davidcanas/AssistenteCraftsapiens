import { Schema, model, Document } from "mongoose";

interface staffDB extends Document {
    nick: string;
    id: string;
    role: string;
    notes: Array<object>;
}

const staffDB: Schema = new Schema(
    {
        nick: {
            type: String,
            required: true,
        },

        id: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            required: true,
        },
        
        notes: {
            type: Array,
            default: [],
        },

    },
    {
        versionKey: false,
    },
);

export default model<staffDB>("Staff", staffDB);
