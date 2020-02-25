const fs = require('fs')
const requestNintendo = require('../helpers/request-nintendo')
const moment = require('moment')
const { TOKEN_STORE } = require('../vars')
const nFormatter = require('../helpers/nFormatter')

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

    const rankRainmaker = determineRank('udemae_rainmaker')
    const rankSplatZones = determineRank('udemae_zones')
    const rankClamBlitz = determineRank('udemae_clam')
    const rankTowerControl  = determineRank('udemae_tower')

    const currentWeaponStats = {
      ...playerInfo.weapon_stats[playerInfo.player.weapon.id],
      weapon: undefined
    }

    nintendoStats = {
      ranks: {
        rankRainmaker,
        rankSplatZones,
        rankClamBlitz,
        rankTowerControl
      },
      gear: {
        weapon: {
          ...playerInfo.player.weapon,
          stats: currentWeaponStats,
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
      weaponStats: {
        wins: weaponArray.sort((x, y) => y.win_count - x.win_count).map(x => ({ name: x.weapon.name, win_count: x.win_count })),
        losses: weaponArray.sort((x, y) => y.lose_count - x.lose_count).map(x => ({ name: x.weapon.name, lose_count: x.lose_count })),
        ratio: weaponArray.sort((x, y) => (y.win_count/y.lose_count) - (x.win_count/x.lose_count)).map(x => ({ name: x.weapon.name, ratio: x.win_count/(x.win_count + x.lose_count), record: `${x.win_count}-${x.lose_count}`, games: x.win_count + x.lose_count })),
        games: weaponArray.sort((x, y) => (y.win_count + y.lose_count) - (x.win_count + x.lose_count)).map(x => ({ name: x.weapon.name, games_played: x.win_count + x.lose_count })),
        turf: weaponArray.sort((x, y) => y.total_paint_point - x.total_paint_point).map(x => ({ name: x.weapon.name, total_paint_point: x.total_paint_point })),
        recent: weaponArray.sort((x, y) => y.last_use_time - x.last_use_time).map(x => ({ name: x.weapon.name, last_use_time: moment(x.last_use_time).format() })),
        meter: weaponArray.sort((x, y) => y.win_meter - x.win_meter).map(x => ({ name: x.weapon.name, win_meter: x.win_meter })),
      },
      output_ranks: `Ranks: Rainmaker ${rankRainmaker}, Splat Zones ${rankSplatZones}, Clam Blitz ${rankClamBlitz}, Tower Control ${rankTowerControl}`,
      output_gear: {
        weapon: `
          Current Weapon: ${playerInfo.player.weapon.name}.
          Weapon Record: ${currentWeaponStats.win_count}-${currentWeaponStats.lose_count}.
          Turf Points: ${nFormatter(currentWeaponStats.total_paint_point, 2)}.
        `,
        head: `
          Current Headgear: ${playerInfo.player.head.name} (${'\u2605'.repeat(playerInfo.player.head.rarity)}).
          Main: ${playerInfo.player.head_skills.main.name}.
          Subs: ${playerInfo.player.head_skills.subs.filter(x => x.name !== 'question mark').map(x => x.name).join(', ')}.
        `,
        clothes: `
          Current Clothes: ${playerInfo.player.clothes.name} (${'\u2605'.repeat(playerInfo.player.clothes.rarity)}).
          Main: ${playerInfo.player.clothes_skills.main.name}.
          Subs: ${playerInfo.player.clothes_skills.subs.filter(x => x.name !== 'question mark').map(x => x.name).join(', ')}.
        `,
        shoes: `
          Current Shoes: ${playerInfo.player.shoes.name} (${'\u2605'.repeat(playerInfo.player.shoes.rarity)}).
          Main: ${playerInfo.player.shoes_skills.main.name}.
          Subs: ${playerInfo.player.shoes_skills.subs.filter(x => x.name !== 'question mark').map(x => x.name).join(', ')}.
        `,
      },
    }
    nintendoStats.output_lifetimeWL = `Lifetime W-L: ${nintendoStats.lifetimeWL}`
    nintendoStats.output_weaponStats = {
      wins: `Most Wins Overall by Weapon: ${nintendoStats.weaponStats.wins.slice(0, 5).map((x, i) => `${i + 1}. ${x.name} (${x.win_count})`).join(', ')}`,
      losses: `Most Losses Overall by Weapon: ${nintendoStats.weaponStats.losses.slice(0, 5).map((x, i) => `${i + 1}. ${x.name} (${x.lose_count})`).join(', ')}`,
      ratio: `Best W-L Ratio by Weapon (min. 20 games): ${nintendoStats.weaponStats.ratio.filter(x => x.games >= 20).slice(0, 5).map((x, i) => `${i + 1}. ${x.name} (${x.record}, ${x.ratio})`).join(', ')}`,
      games: `Most Games Overall by Weapon: ${nintendoStats.weaponStats.games.slice(0, 5).map((x, i) => `${i + 1}. ${x.name} (${x.games_played})`).join(', ')}`,
      turf: `Most Turf Painted by Weapon: ${nintendoStats.weaponStats.turf.slice(0, 5).map((x, i) => `${i + 1}. ${x.name} (${nFormatter(x.total_paint_point, 2)})`).join(', ')}`,
      recent: `Most Recently Used Weapon: ${nintendoStats.weaponStats.turf.slice(0, 5).map((x, i) => `${i + 1}. ${x.name} (${x.last_use_time})`).join(', ')}`
    }
  } catch (e) {
    console.log('** Error retrieving nintendo stats', e)
    nintendoStats = {}
  }
  return res.send(nintendoStats)
}
