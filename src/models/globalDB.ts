import { Schema, model, Document } from "mongoose";

interface globalDB extends Document {
  id: string;
  classes: {
    enabled: boolean;
    reason: string;
  };
  helped: number;
  ignoredChannels: string[];
  ignoredUsers: string[];
  whitelistedUrl: string[];
}

const globalDB: Schema = new Schema(
  {
    id: {
      required: true,
      type: String,
    },
    classes: {
      enabled: {
        type: Boolean,
        default: false,
      },
      reason: {
        type: String,
        default: "Motivo não especificado",
      },
    },

    helped: {
      type: Number,
      default: 1,
    },
    
    whitelistedUrl: {
      type: Array,
      default: [],  
    },
    
    ignoredChannels: {
      type: Array,
      default: [],
    },
    ignoredUsers: { 
      type: Array,
      default: [],
    },
  },
  {
    versionKey: false,
  },
);

export default model<globalDB>("Global", globalDB);
