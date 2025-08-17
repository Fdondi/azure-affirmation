import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function affirmation(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
}

app.http('affirmation', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: affirmation
});
