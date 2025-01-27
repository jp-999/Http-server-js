const net = require("net");
const process = require("process");
const path = require("path");
const fs = require("fs/promises");
const hostname = "0.0.0.0";
const port = 4221;

const server = net.createServer();

let filesDir = null;

if (process.argv.length >= 4) {
    if (process.argv[2] == '--directory') {
        filesDir = process.argv[3];
    }
}

server.on("connection", (socket) => {
    socket.on("data", (data) => {
        const request = data.toString();
        const lines = request.split("\r\n");
        const [method, reqPath, version] = lines[0].split(" ")
        if (reqPath === "/") {
            socket.write("HTTP/1.1 200 OK\r\n\r\n");
            socket.end();
        } else if (reqPath === "/user-agent") {
            for (const line of lines) {
                if (line.startsWith("User-Agent: ")) {
                    const content = line.replace(/^User-Agent: /, "")
                    socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${content.length}\r\n\r\n${content}`);
                }
            }
            socket.end();
        } else if (reqPath.startsWith("/echo/")) {
            const content = reqPath.replace(/^\const net = require("net");
const process = require("process");
const path = require("path");
const fs = require("fs/promises");
const hostname = "0.0.0.0";
const port = 4221;

const server = net.createServer();

let filesDir = null;

if (process.argv.length >= 4) {
    if (process.argv[2] === '--directory') {
        filesDir = process.argv[3];
    }
}

server.on("connection", (socket) => {
    socket.on("data",/echo\//, "");
            socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${content.length}\r\n\r\n${content}`);
            socket.end();
        } else if (reqPath.startsWith("/files/")) {
            const filePath = path.join(filesDir, reqPath.replace(/^\/files\//, ""));
            if (method === "GET") {
                fs.readFile(filePath)
                    .then((content) => {
                        socket.write(`HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${content.length}\r\n\r\n`);
                        socket.write(content);
                        socket.end();
                    })
                    .catch((err) => {
                        socket.write("HTTP/1.1 404 Not found\r\n\r\n");
                        socket.end();
                    });
            } else if (method === "POST") {
                // TODO: properly parse request contents
                let contentStarted = false;
                const content = [];
                for (const line of lines) {
                    if (contentStarted) {
                        content.push(line);
                    } else if (line === "") {
                        contentStarted = true
                    }
                }
                fs.writeFile(filePath, content.join("\r\n"))
                    .then(() => {
                        socket.write(`HTTP/1.1 201 Created\r\n\r\n`);
                        socket.end();
                    })
                    .catch((err) => {
                        socket.write("HTTP/1.1 500 Internal server error\r\n\r\n");
                        socket.end();
                    });
            }
        } else {
            socket.write("HTTP/1.1 404 Not found\r\n\r\n");
            socket.end();
        }
    });
})

server.listen(port, hostname);

console.log(`Listening for connections on: ${hostname}:${port}`);
if (filesDir) {
    console.log(`Serving files from directory: "${filesDir}"`);
}