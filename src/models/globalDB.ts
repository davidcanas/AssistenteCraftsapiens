import { Schema, model, Document } from 'mongoose';

interface globalDB extends Document {
  id: string;
  classes: {
    enabled: boolean;
    reason: string;
  };
  music: {
	blacklistedUsers: string[];
	restrictedChannels: string[];
  };
  helped: number;
  urlsDeleted: number;
  ignoredChannels: string[];
  ignoredUsers: string[];
  usersInCooldown: string[];
  whitelistedUrl: string[];
  whitelistedUrlEnabled: boolean;
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
				default: 'Motivo não especificado',
			},
		},

		helped: {
			type: Number,
			default: 1,
		},
        urlsDeleted: {
			type: Number,
			default: 1
		},
		whitelistedUrl: {
			type: Array,
			default: [],  
		},
		whitelistedUrlEnabled: {
			type: Boolean,
			default: true,
		},
    
		ignoredChannels: {
			type: Array,
			default: [],
		},

		ignoredUsers: {
			type: Array,
			default: [],
		},

		usersInCooldown: { 
			type: Array,
			default: [],
		},
       
		music: {
			blacklistedUsers: {
				type: Array,
				default: [],
			},

			restrictedChannels: {
				type: Array,
				default: [],
        
			},	

		},
			
		
    
		},	
	{
		versionKey: false,
	},
);

export default model<globalDB>('Global', globalDB);
