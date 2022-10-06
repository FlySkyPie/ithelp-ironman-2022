import * as fs from 'fs';
import * as os from 'os';
import { spawn, } from 'child_process';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';

const nullDev = fs.createWriteStream(os.devNull);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let isRendererConnected = false;

io.on('connection', (socket) => {
    if (isRendererConnected) {
        console.log('[Warn]', 'The renderer already connected, this connection would be ignore.');
        socket.disconnect();
    }
    isRendererConnected = true;
    console.log("[Info]", 'Renderer is connected');

    const resultViewer = spawn('mpv', [
        '--profile=low-latency',
        '--no-cache',
        //'--untimed',
        //'--opengl-glfinish=yes',
        //'--opengl-swapinterval=0',
        //'--vo=xv',/** */
        '--geometry=50%+0+0',
        '--no-border',
        '-'
    ]);
    const resultPreproccer = spawn('ffmpeg', [
        '-hide_banner',

        '-f', 'bmp_pipe',
        '-framerate', '20',
        '-i', 'pipe:0',

        '-f', 'nut',
        '-tune', 'zerolatency',
        '-preset', 'ultrafast',

        'pipe:1',
    ]);

    resultPreproccer.stdout.pipe(resultViewer.stdin);
    resultPreproccer.stderr.pipe(nullDev);

    socket.on('disconnect', () => {
        isRendererConnected = false;
        console.log("[Info]", 'Renderer is disconnected');
        resultPreproccer.stdin.end();
    }).on('render', (buffer: Buffer) => {
        const dwebp = spawn('dwebp', [
            '-o', '-',
            '-bmp',
            '--', '-',
        ]);

        dwebp.stdin.end(buffer);
        dwebp.stdout.on('data', (data) => {
            resultPreproccer.stdin.write(data);
        })
    }).on("connect_error", (err) => {
        console.log("[Info]", `connect_error due to ${err.message}`);
    });
});

server.listen(3030, () => {
    console.log('[Server]', 'listening on *:3030');
});
