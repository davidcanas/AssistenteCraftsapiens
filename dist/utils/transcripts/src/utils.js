"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optsSetup = exports.castToType = exports.intColorToHex = exports.charCodeUTF32 = exports.downloadImageToDataURL = void 0;
const axios_1 = __importDefault(require("axios"));
async function downloadImageToDataURL(url) {
    const response = await axios_1.default
        .get(url, {
        responseType: "arraybuffer",
        validateStatus: (status) => status >= 200 && status < 300,
    })
        .then((res) => {
        const data = Buffer.from(res.data, "binary").toString("base64");
        const mime = res.headers["content-type"];
        return `data:${mime};base64,${data}`;
    })
        .catch((err) => {
        if (!process.env.HIDE_TRANSCRIPT_ERRORS) {
            console.error("Failed to download image for transcript: ", err);
        }
        return null;
    });
    return response;
}
exports.downloadImageToDataURL = downloadImageToDataURL;
// https://stackoverflow.com/questions/6639770/how-do-i-get-the-unicode-hex-representation-of-a-symbol-out-of-the-html-using-ja
const charCodeUTF32 = (char) => {
    return ((char.charCodeAt(0) - 0xd800) * 0x400 +
        (char.charCodeAt(1) - 0xdc00) +
        0x10000);
};
exports.charCodeUTF32 = charCodeUTF32;
const intColorToHex = (color) => {
    if (!color)
        return;
    return `#${color.toString(16).padStart(6, "0")}`;
};
exports.intColorToHex = intColorToHex;
// i think this is cleaner than writing "variable as unknown as type"
// used when i cant skip using "as unknown"
function castToType(type) {
    return type;
}
exports.castToType = castToType;
const DEFAULT_OPTIONS = {
    returnType: "attachment",
    fileName: "transcript.html",
    minify: true,
    saveImages: false,
    useCDN: true
};
function optsSetup(opts = {}, _channel) {
    return {
        ...DEFAULT_OPTIONS,
        ...opts,
    };
}
exports.optsSetup = optsSetup;
