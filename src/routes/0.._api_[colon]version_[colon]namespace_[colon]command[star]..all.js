import bunyan from 'bunyan'
import ApiVersions from '../libs/api/'
import PostgresClient from '../libs/PostgresClient'
import RedisHelper from '../libs/RedisHelper'
import Routes from '../libs/Routes'
import TeamEvents from '../libs/models/TeamEvents'
import config from '../config'

const log = bunyan.createLogger(config.logger.options)
const postgres  = new PostgresClient()
const redis     = new RedisHelper()
const events    = TeamEvents(postgres, { redis })

export default {
  createRouteWithOptions({ io }) {
    return [
        Routes.requireAuthExpressMiddleware(),
        async function ApiNamespaceCommand(req, res) {
        const version       = req.params.version
        const namespace     = req.params.namespace
        const command       = req.params.command
        const additional    = req.params[0]
        const finalCommand  = (additional) ? `${command}${additional}` : command

        try {
          await ApiVersions[version][namespace][finalCommand]({
            req,
            res,
            log,
            postgres,
            redis,
            io,
            events
          })
        } catch(err) {
          log.error("Error with API request", err)
          res.sendStatus(500)
        }
      }
    ]
  }
}
