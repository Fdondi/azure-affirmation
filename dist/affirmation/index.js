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
exports.affirmation = void 0;
const functions_1 = require("@azure/functions");
function affirmation(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log('HTTP trigger function processed a request.');
        // For now, always return "Ok" as requested
        const responseMessage = {
            message: "Ok",
            timestamp: new Date().toISOString()
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
exports.affirmation = affirmation;
functions_1.app.http('affirmation', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: affirmation
});
//# sourceMappingURL=index.js.map