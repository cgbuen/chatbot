const fs = require('fs')
const requestNintendo = require('../helpers/request-nintendo')
const moment = require('moment')
const { TOKEN_STORE } = require('../vars')

module.exports = async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  const nintendoStatsResponse = await requestNintendo.getRecords((fs.readFileSync(`./${TOKEN_STORE}/nintendo-access`, 'utf8') || '').trim())
  let nintendoStats
  try {
    const playerInfo = {
      player: nintendoStatsResponse.recordsResponse.records.player,
      win_count: nintendoStatsResponse.recordsResponse.records.win_count,
      lose_count: nintendoStatsResponse.recordsResponse.records.lose_count,
      weapon_stats: nintendoStatsResponse.recordsResponse.records.weapon_stats,
      x_leaderboard: nintendoStatsResponse.xLeaderboardResponse
    }

    const translateMode = mode => {
      const dict = {
        udemae_clam: 'clam_blitz',
        udemae_zones: 'splat_zones',
        udemae_rainmaker: 'rainmaker',
        udemae_tower: 'tower_control'
      }
      return dict[mode]
    }

    const determineRank = modeName => {
      const mode = playerInfo.player[modeName]
      let rank
      if (mode.is_x) {
        const ranking = playerInfo.x_leaderboard[translateMode(modeName)].my_ranking
        if (ranking) {
          const power = ranking.x_power || 'calibrating'
          return `X (${power})`
        } else {
          return 'S+9'
        }
      } else if (mode.name === 'S+') {
        return `S+${mode.s_plus_number}`
      } else {
        return get(mode, 'name')
      }
    }

    const weaponArray = []
    for (let key in playerInfo.weapon_stats) {
      if (playerInfo.weapon_stats[key]) {
        weaponArray.push(playerInfo.weapon_stats[key])
      }
    }

    nintendoStats = {
      ranks: {
        rm: determineRank('udemae_rainmaker'),
        sz: determineRank('udemae_zones'),
        cb: determineRank('udemae_clam'),
        tc: determineRank('udemae_tower')
      },
      gear: {
        weapon: {
          ...playerInfo.player.weapon,
          stats: {
            ...playerInfo.weapon_stats[playerInfo.player.weapon.id],
            weapon: undefined
          },
        },
        head: {
          ...playerInfo.player.head,
          skills: playerInfo.player.head_skills
        },
        clothes: {
          ...playerInfo.player.clothes,
          skills: playerInfo.player.clothes_skills
        },
        shoes: {
          ...playerInfo.player.shoes,
          skills: playerInfo.player.shoes_skills
        }
      },
      lifetimeWL: playerInfo.win_count && `${playerInfo.win_count}-${playerInfo.lose_count}`,
      weaponStatsMostWins: weaponArray.sort((x, y) => y.win_count - x.win_count).map(x => ({ name: x.weapon.name, win_count: x.win_count })),
      weaponStatsMostLosses: weaponArray.sort((x, y) => y.lose_count - x.lose_count).map(x => ({ name: x.weapon.name, lose_count: x.lose_count })),
      weaponStatsHighestRatio: weaponArray.sort((x, y) => (y.win_count/y.lose_count) - (x.win_count/x.lose_count)).map(x => ({ name: x.weapon.name, ratio: x.win_count/(x.win_count + x.lose_count), record: `${x.win_count}-${x.lose_count}` })),
      weaponStatsMostGames: weaponArray.sort((x, y) => (y.win_count + y.lose_count) - (x.win_count + x.lose_count)).map(x => ({ name: x.weapon.name, games_played: x.win_count + x.lose_count })),
      weaponStatsMostTurf: weaponArray.sort((x, y) => y.total_paint_point - x.total_paint_point).map(x => ({ name: x.weapon.name, total_paint_point: x.total_paint_point })),
      weaponStatsLastUsed: weaponArray.sort((x, y) => y.last_use_time - x.last_use_time).map(x => ({ name: x.weapon.name, last_use_time: moment(x.last_use_time).format() })),
      weaponStatsWinMeter: weaponArray.sort((x, y) => y.win_meter - x.win_meter).map(x => ({ name: x.weapon.name, win_meter: x.win_meter })),
    }
  } catch (e) {
    nintendoStats = {}
  }
  return res.send(nintendoStats)
}
