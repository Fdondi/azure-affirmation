"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDate = testDate;
exports.getRandomLine = getRandomLine;
const functions_1 = require("@azure/functions");
const crypto_1 = require("crypto");
const mongodb_1 = require("mongodb");
const version_1 = require("./shared/version");
// Validate required environment variables
function getEnvVar(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function testDate(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log('HTTP trigger function processed a request.');
        // For now, always return "Ok" as requested
        const responseMessage = {
            message: "Ok",
            timestamp: new Date().toISOString(),
            version: version_1.VERSION
        };
        return {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            jsonBody: responseMessage
        };
    });
}
functions_1.app.http('testDate', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: testDate
});
function tryGetEnvVar(name) {
    const value = process.env[name];
    if (!value)
        return null;
    return value;
}
const mongoUri = tryGetEnvVar('MONGODB_URI');
if (!mongoUri) {
    throw new Error('Missing required environment variable: MONGODB_URI');
}
const client = new mongodb_1.MongoClient(mongoUri);
let connected = null;
function ensureConn() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!connected)
            connected = client.connect().then(() => undefined);
        return connected;
    });
}
function getRandomLine(req, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        // Handle CORS preflight requests
        if (req.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token",
                    "Access-Control-Max-Age": "86400"
                }
            };
        }
        // Log request basics for debugging
        ctx.log('Request method:', req.method);
        ctx.log('Request URL:', req.url);
        // Check authentication - try both Azure Static Web Apps header and custom header
        let clientPrincipal = req.headers.get ? req.headers.get('x-ms-client-principal') : req.headers['x-ms-client-principal'];
        let user = null;
        // If no Azure Static Web Apps header, try custom header from frontend
        if (!clientPrincipal) {
            const userToken = req.headers.get ? req.headers.get('x-user-token') : req.headers['x-user-token'];
            if (userToken) {
                try {
                    const decoded = Buffer.from(userToken, 'base64').toString();
                    user = JSON.parse(decoded);
                    ctx.log('Authenticated user from custom header:', user.userDetails);
                    // Validate that the user is authenticated
                    if (!user.userDetails || !user.userRoles || !user.userRoles.includes('authenticated')) {
                        ctx.log('User token invalid - not authenticated');
                        ctx.log('User details:', user.userDetails);
                        ctx.log('User roles:', user.userRoles);
                        user = null;
                    }
                }
                catch (error) {
                    ctx.log('Error parsing custom user token:', error);
                }
            }
        }
        else {
            // Decode the base64 encoded client principal from Azure Static Web Apps
            try {
                const decoded = Buffer.from(clientPrincipal, 'base64').toString();
                user = JSON.parse(decoded);
                ctx.log('Authenticated user from Azure header:', user.userDetails);
            }
            catch (error) {
                ctx.log('Error parsing client principal:', error);
            }
        }
        if (!user) {
            ctx.log('No valid authentication found');
            const xUserToken = req.headers.get ? req.headers.get('x-user-token') : req.headers['x-user-token'];
            const xMsClient = req.headers.get ? req.headers.get('x-ms-client-principal') : req.headers['x-ms-client-principal'];
            return {
                status: 401,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Token"
                },
                jsonBody: {
                    error: "Unauthorized - Please log in",
                    version: version_1.VERSION,
                    debug: "No valid authentication found",
                    xUserToken: xUserToken ? 'present' : 'missing',
                    xMsClientPrincipal: xMsClient ? 'present' : 'missing'
                }
            };
        }
        const dbName = tryGetEnvVar('DB_NAME');
        const collectionName = tryGetEnvVar('COLLECTION_NAME');
        if (!dbName || !collectionName) {
            return {
                status: 500,
                jsonBody: { error: "Missing required environment variables", "db": dbName, "collection": collectionName, "version": version_1.VERSION }
            };
        }
        try {
            yield ensureConn();
            const db = client.db(dbName);
            const col = db.collection(collectionName);
            const n = yield col.estimatedDocumentCount();
            const k = (0, crypto_1.randomInt)(0, n);
            const [doc] = yield col.aggregate([{ $skip: k }, { $limit: 1 }]).toArray();
            if (!doc) {
                return {
                    status: 404,
                    jsonBody: { error: "No lines found", "db": dbName, "collection": collectionName, "version": version_1.VERSION }
                };
            }
            return {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                jsonBody: { line: doc.text, version: version_1.VERSION }
            };
        }
        catch (error) {
            ctx.error('Error fetching random affirmation:', error, "data", {
                "db": dbName,
                "collection": collectionName,
                "uri": mongoUri,
                "error": error
            });
            return {
                status: 500,
                jsonBody: { error: "Internal server error: " + error, "db": dbName, "collection": collectionName, "version": version_1.VERSION }
            };
        }
    });
}
functions_1.app.http("getRandomLine", {
    methods: ["GET", "POST", "OPTIONS"],
    authLevel: "anonymous",
    handler: getRandomLine
});
//# sourceMappingURL=affirmation.js.map