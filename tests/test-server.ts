const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #333; }
        p { color: #666; }
    </style>
</head>
<body>
    <h1>Hello from Bun Tunnel Test!</h1>
    <p>This is a simple HTML page served by Bun.</p>
    <p>Timestamp: ${new Date().toISOString()}</p>
    <p><a href="/json">JSON API</a> | <a href="/stream">Streaming</a> | <a href="/delay">Delayed</a> | <a href="/404">404 Test</a> | <a href="/app-login">App Login</a> | <a href="/app-register">App Register</a></p>
</body>
</html>
`;

const jsonResponse = { message: 'Hello from JSON API', timestamp: new Date().toISOString() };

Bun.serve({
    port: 3001,
    fetch(req) {
        const url = new URL(req.url);
        console.log(`${req.method} ${url.pathname}`);

        switch (url.pathname) {
            case '/':
                return new Response(html, {
                    headers: { 'Content-Type': 'text/html' },
                });
            case '/json':
                return new Response(JSON.stringify(jsonResponse), {
                    headers: { 'Content-Type': 'application/json' },
                });
            case '/stream':
                return new Response(
                    new ReadableStream({
                        start(controller) {
                            let count = 0;
                            const interval = setInterval(() => {
                                if (count >= 10) {
                                    controller.close();
                                    clearInterval(interval);
                                    return;
                                }
                                controller.enqueue(`data: ${count++}\n\n`);
                            }, 1000);
                        },
                    }),
                    {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                        },
                    }
                );
            case '/delay':
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(new Response('Delayed response after 2 seconds', {
                            headers: { 'Content-Type': 'text/plain' },
                        }));
                    }, 2000);
                });
            case '/app-login':
                return new Response(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>App Login</title></head>
                    <body>
                        <h1>App Login</h1>
                        <form method="POST" action="/app-login">
                            <label>Email: <input type="email" name="email" required></label><br>
                            <label>Password: <input type="password" name="password" required></label><br>
                            <button type="submit">Login to App</button>
                        </form>
                        <p>This is the app's login page (proxied through tunnel).</p>
                    </body>
                    </html>
                `, { headers: { 'Content-Type': 'text/html' } });
            case '/app-register':
                return new Response(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>App Register</title></head>
                    <body>
                        <h1>App Register</h1>
                        <form method="POST" action="/app-register">
                            <label>Email: <input type="email" name="email" required></label><br>
                            <label>Password: <input type="password" name="password" required></label><br>
                            <button type="submit">Register for App</button>
                        </form>
                        <p>This is the app's register page (proxied through tunnel).</p>
                    </body>
                    </html>
                `, { headers: { 'Content-Type': 'text/html' } });
            case '/404':
                return new Response('Not Found', { status: 404 });
            default:
                return new Response('Not Found', { status: 404 });
        }
    },
});

console.log('Test server running on http://localhost:3001');