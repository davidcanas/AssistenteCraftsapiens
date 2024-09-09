"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTranscript = exports.generateFromMessages = void 0;
/* eslint-disable @typescript-eslint/ban-types */
const oceanic_js_1 = require("oceanic.js");
const exporthtml_1 = __importDefault(require("./exporthtml"));
const utils_1 = require("./utils");
/**
 * @example
 *   const attachment = await generateFromMessages(messages, channel, {
 *       returnBuffer: false, // Return a buffer instead of a MessageAttachment
 *       returnType: 'attachment', // Valid options: 'buffer' | 'string' | 'attachment' Default: 'attachment'
 *       minify: true, // Minify the result? Uses html-minifier
 *       saveImages: false, // Download all images and include the image data in the HTML (allows viewing the image even after it has been deleted) (! WILL INCREASE FILE SIZE !)
 *       useCDN: false // Uses a CDN to serve discord styles rather than bundling it in the HTML (saves ~8kb when minified)
 *   });
 */
function generateFromMessages(messages, channel, opts) {
    const options = (0, utils_1.optsSetup)(opts, channel);
    // Turn collection into an array
    if (messages instanceof oceanic_js_1.Collection) {
        messages = messages.map(m => m);
    }
    // Check if is array
    if (!Array.isArray(messages)) {
        throw new Error("Provided messages must be either an array or a collection of Messages.");
    }
    // If no messages were provided, generate empty transcript
    if (messages.length === 0) {
        return (0, exporthtml_1.default)(messages, channel, options);
    }
    // Check if array contains discord messages
    if (!(messages[0] instanceof oceanic_js_1.Message)) {
        throw new Error("Provided messages does not contain valid Messages.");
    }
    return (0, exporthtml_1.default)(messages, channel, options);
}
exports.generateFromMessages = generateFromMessages;
/**
 * @example
 *   const attachment = await createTranscript(channel, {
 *       limit: -1, // Max amount of messages to fetch.
 *       returnType: 'attachment', // Valid options: 'buffer' | 'string' | 'attachment' Default: 'attachment'
 *       fileName: 'transcript.html', // Only valid with returnBuffer false. Name of attachment.
 *       minify: true, // Minify the result? Uses html-minifier
 *       saveImages: false, // Download all images and include the image data in the HTML (allows viewing the image even after it has been deleted) (! WILL INCREASE FILE SIZE !)
 *       useCDN: false // Uses a CDN to serve discord styles rather than bundling it in HTML (saves ~8kb when minified)
 *   });
 */
async function createTranscript(channel, opts) {
    const options = (0, utils_1.optsSetup)(opts, channel);
    if (!("limit" in options))
        options.limit = -1;
    if (!channel)
        throw new TypeError("Provided channel must be a valid channel.");
    const sum_messages = [];
    let last_id;
    while (true) {
        const fetchOptions = { limit: 100, before: last_id };
        if (!last_id)
            delete fetchOptions["before"];
        const messages = await channel.getMessages(fetchOptions);
        sum_messages.push(...messages);
        last_id = messages[messages.length - 1]?.id;
        if (messages.length != 100 || (sum_messages.length >= options.limit && options.limit != -1))
            break;
    }
    return await (0, exporthtml_1.default)(sum_messages, channel, options);
}
exports.createTranscript = createTranscript;
