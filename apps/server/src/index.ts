import express from 'express'
import cors from 'cors'
import { config } from './config'
import { healthRouter } from './routes/health'
import { tokenRouter } from './routes/token'
import { configRouter } from './routes/config'

const app = express()
app.use(express.json())
app.use(cors({ origin: ['http://localhost:5173'] }))

app.use('/api', healthRouter)
app.use('/api', tokenRouter)
app.use('/api', configRouter)

app.listen(config.PORT, () => {
  console.log(`▶ serveur sur http://localhost:${config.PORT}`)
})