"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_EXTS = exports.timestampLong = exports.timestampShort = exports.MINIFY_OPTIONS = exports.LanguageAliases = exports.DummyUser = exports.defaultPFP = void 0;
exports.defaultPFP = "https://cdn.discordapp.com/embed/avatars/0.png";
exports.DummyUser = {
    bot: false,
    id: "00000000000",
    discriminator: "Usuário#0000",
    name: "Usuário",
    username: "Usuário",
    accentColor: "#FFFFFF",
    avatarURL: (format) => `https://cdn.discordapp.com/embed/avatars/0.${format}`,
};
exports.LanguageAliases = {
    ts: "typescript",
    js: "javascript",
    py: "python",
    rb: "ruby",
};
exports.default = {
    defaultPFP: exports.defaultPFP,
    DummyUser: exports.DummyUser,
    LanguageAliases: exports.LanguageAliases,
};
exports.MINIFY_OPTIONS = {
    caseSensitive: false,
    collapseBooleanAttributes: true,
    collapseInlineTagWhitespace: true,
    collapseWhitespace: true /* if spacing is broken this may be the issue */,
    conservativeCollapse: true,
    keepClosingSlash: true,
    minifyCSS: true,
    minifyJS: true,
    minifyURLs: true,
    preserveLineBreaks: false /* jsdom already removes linebreaks */,
    removeComments: true,
    removeAttributeQuotes: true,
    removeEmptyAttributes: true,
    removeOptionalTags: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    removeTagWhitespace: true,
    useShortDoctype: true,
};
exports.timestampShort = {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
};
exports.timestampLong = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
};
exports.IMAGE_EXTS = ["png", "jpg", "jpeg", "gif"];
