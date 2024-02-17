import express from 'express'
import ViteExpress from 'vite-express'
import http from 'http'
import { Server } from 'socket.io'
import db from './utils/db.js'
import logger from './utils/logger.js'
import dotenv from 'dotenv'

const app = express()
dotenv.config() // load env vars
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(express.static('public'))
app.use(express.static('dist'))

const server = http.createServer(app)
const io = new Server(server)
ViteExpress.config({ printViteDevServerHost: true })

// routes
// app.get('/', (req, res) => {
//     res.sendFile('index.html', { root: '.' })
// })

/**
 * * -------= TO DO =-------
 * 
 * * - create prod and dev env files 
 * * -move project to docker for redis and docker for prod node server
 * ? -Add messaging queues to scale infinitely
 * ? - 
 */

await db.redis.connect();
await db.redis.wipeCanvas();

app.get('/api', (req, res) => {
    res.json({Success: "true"})
})

app.get('/getCanvas', async (req, res) => {
    res.status(200).send(await db.redis.getCanvas())
});

//on socket connection
io.on('connection', (socket) => {
    socket.on('disconnect', () => {})

    socket.on('pixel-update', async (data) => {
        try {
            logger.info(`Setting Index ${data.data.index}, Redis Response: ` + await db.redis.setPixel(data.data.index, data.data.color))
        } catch (err) {
            logger.info(`An error occured updating the redis cache: ${err.message}`)
        }

        io.emit('pixel-update', {data: {index: data.data.index, color: data.data.color}});
    })

    socket.on('canvas-reset', async (data) => {

        try {
            await db.redis.wipeCanvas();
            io.emit('canvas-reset', {data: {message: 'Canvas Wiped', canvas: await db.redis.getCanvas()}});
        } catch (err) {
            logger.error(err)
            io.emit('canvas-reset', {data: 'Canvas Not Wiped, Error'});
        }

    })
})

server.listen(8000, () => {
    logger.info(`Hold ctrl and click this: ${process.env.VITE_SERVER_URL}/`)
})

//open server
ViteExpress.bind(app, server)