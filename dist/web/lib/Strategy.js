"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-this-alias */
const passport_oauth2_1 = __importDefault(require("passport-oauth2"));
const passport_oauth2_2 = require("passport-oauth2");
const util_1 = __importDefault(require("util"));
function Strategy(options, verify) {
    options = options || {};
    options.authorizationURL = options.authorizationURL || "https://discord.com/api/oauth2/authorize";
    options.tokenURL = options.tokenURL || "https://discord.com/api/oauth2/token";
    options.scopeSeparator = options.scopeSeparator || " ";
    passport_oauth2_1.default.call(this, options, verify);
    this.name = "discord";
    this._oauth2.useAuthorizationHeaderforGET(true);
}
/**
 * Inherits from `OAuth2Strategy`
 */
util_1.default.inherits(Strategy, passport_oauth2_1.default);
/**
 * Retrieve user profile from Discord.
 *
 * This function constructs a normalized profile.
 * Along with the properties returned from /users/@me, properties returned include:
 *   - `connections`      Connections data if you requested this scope
 *   - `guilds`           Guilds data if you requested this scope
 *   - `fetchedAt`        When the data was fetched as a `Date`
 *   - `accessToken`      The access token used to fetch the (may be useful for refresh)
 *
 * @param {string} accessToken
 * @param {function} done
 * @access protected
 */
Strategy.prototype.userProfile = function (accessToken, done) {
    const self = this;
    this._oauth2.get("https://discord.com/api/users/@me", accessToken, function (err, body, res) {
        if (err) {
            return done(new passport_oauth2_2.InternalOAuthError("Oops...failed to fetch the user profile from discord.", err));
        }
        let parsedData;
        try {
            parsedData = JSON.parse(body);
        }
        catch (e) {
            return done(new Error("Oops...failed to parse the user profile."));
        }
        const profile = parsedData; // has the basic user stuff
        profile.provider = "discord";
        profile.accessToken = accessToken;
        self.checkScope("connections", accessToken, function (errx, connections) {
            if (errx)
                done(errx);
            if (connections)
                profile.connections = connections;
            self.checkScope("guilds", accessToken, function (erry, guilds) {
                if (erry)
                    done(erry);
                if (guilds)
                    profile.guilds = guilds;
                profile.fetchedAt = new Date();
                return done(null, profile);
            });
        });
    });
};
Strategy.prototype.checkScope = function (scope, accessToken, cb) {
    if (this._scope && this._scope.indexOf(scope) !== -1) {
        this._oauth2.get("https://discord.com/api/users/@me/" + scope, accessToken, function (err, body, res) {
            if (err)
                return cb(new passport_oauth2_2.InternalOAuthError("Oops...failed to fetch user's " + scope, err));
            let json;
            try {
                json = JSON.parse(body);
            }
            catch (e) {
                return cb(new Error("Oops...failed to parse user's " + scope));
            }
            cb(null, json);
        });
    }
    else {
        cb(null, null);
    }
};
/**
 * Return extra parameters to be included in the authorization request.
 *
 * @param {Object} options
 * @return {Object}
 * @api protected
 */
Strategy.prototype.authorizationParams = function (options) {
    const params = {};
    if (typeof options.permissions !== "undefined") {
        params.permissions = options.permissions;
    }
    return params;
};
/**
 * Expose `Strategy`.
 */
exports.default = Strategy;
