import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { healthRouter } from './routes/health.js'
import { tokenRouter } from './routes/token.js'
import { configRouter } from './routes/config.js'
import { authRouter } from './routes/auth.js'

const app = express()
app.use(express.json())

// CORS : localhost en dev + origine frontend en prod si fournie. Pas de wildcard.
const allowedOrigins = ['http://localhost:5173']
if (config.WEB_ORIGIN) allowedOrigins.push(config.WEB_ORIGIN)
app.use(cors({ origin: allowedOrigins }))

app.use('/api', healthRouter)
app.use('/api', tokenRouter)
app.use('/api', configRouter)
app.use('/api', authRouter)

app.listen(config.PORT, () => {
  console.log(`▶ serveur sur http://localhost:${config.PORT}`)
})