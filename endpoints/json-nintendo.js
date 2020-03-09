const fs = require('fs')
const requestNintendo = require('../helpers/request-nintendo')
const moment = require('moment')
const { TOKEN_STORE } = require('../vars')
const nFormatter = require('../helpers/nFormatter')
const unbreak = require('../helpers/unbreak')

module.exports = async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  const nintendoStatsResponse = await requestNintendo.getRecords((fs.readFileSync(`./${TOKEN_STORE}/nintendo-access`, 'utf8') || '').trim())
  let nintendoStats
  try {
    const playerInfo = {
      player: nintendoStatsResponse.recordsResponse.records.player,
      league_stats: nintendoStatsResponse.recordsResponse.records.league_stats,
      win_count: nintendoStatsResponse.recordsResponse.records.win_count,
      lose_count: nintendoStatsResponse.recordsResponse.records.lose_count,
      weapon_stats: nintendoStatsResponse.recordsResponse.records.weapon_stats,
      x_leaderboard: nintendoStatsResponse.xLeaderboardResponse,
      salmon_run: nintendoStatsResponse.salmonRunResponse
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
        const power = ranking ? ranking.x_power : 'calibrating'
        return `X (${power})`
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

    nintendoStats = {
      ranks: {
        rankRainmaker,
        rankSplatZones,
        rankClamBlitz,
        rankTowerControl
      },
      league: {
        ...playerInfo.league_stats,
        max_league_point_team: playerInfo.player.max_league_point_team,
        max_league_point_pair: playerInfo.player.max_league_point_pair
      },
      gear: {
        weapon: {
          ...playerInfo.player.weapon,
          stats: {
            ...playerInfo.weapon_stats[playerInfo.player.weapon.id],
            weapon: undefined
          }
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
        wins: weaponArray
          .sort((x, y) => y.win_count - x.win_count)
          .map(x => ({ name: x.weapon.name, win_count: x.win_count })),
        losses: weaponArray
          .sort((x, y) => y.lose_count - x.lose_count)
          .map(x => ({ name: x.weapon.name, lose_count: x.lose_count })),
        ratio: weaponArray
          .sort((x, y) => (y.win_count/y.lose_count) - (x.win_count/x.lose_count))
          .map(x => ({ name: x.weapon.name, ratio: x.win_count/(x.win_count + x.lose_count), record: `${x.win_count}-${x.lose_count}`, games: x.win_count + x.lose_count })),
        games: weaponArray
          .sort((x, y) => (y.win_count + y.lose_count) - (x.win_count + x.lose_count))
          .map(x => ({ name: x.weapon.name, games_played: x.win_count + x.lose_count })),
        turf: weaponArray
          .sort((x, y) => y.total_paint_point - x.total_paint_point)
          .map(x => ({ name: x.weapon.name, total_paint_point: x.total_paint_point })),
        recent: weaponArray
          .sort((x, y) => y.last_use_time - x.last_use_time)
          .map(x => ({ name: x.weapon.name, last_use_time: moment(x.last_use_time*1000).format() })),
        meter: weaponArray
          .sort((x, y) => y.win_meter - x.win_meter)
          .map(x => ({ name: x.weapon.name, win_meter: x.win_meter })),
      },
      salmonRun: {
        total_golden_eggs: playerInfo.salmon_run.summary.card.golden_ikura_total,
        total_power_eggs: playerInfo.salmon_run.summary.card.ikura_total,
        total_points: playerInfo.salmon_run.summary.card.kuma_point_total,
        total_games: playerInfo.salmon_run.summary.card.job_num,
        total_rescues: playerInfo.salmon_run.summary.card.help_total,
        current_points: playerInfo.salmon_run.summary.card.kuma_point,
        current_level: playerInfo.salmon_run.summary.stats[0].grade_point
      }
    }


    const isNotQuestionMark = x => (x && x.name && x.name !== 'question mark')
    const removeParen = x => (x.name || '').replace(/[\(\)]/g, '')

    // append all output_ values based on what's nintendoStats already has
    nintendoStats.output_ranks = `[Ranks] ${
      [
        `Rainmaker: ${nintendoStats.ranks.rankRainmaker}`,
        `Splat Zones: ${nintendoStats.ranks.rankSplatZones}`,
        `Clam Blitz: ${nintendoStats.ranks.rankClamBlitz}`,
        `Tower Control: ${nintendoStats.ranks.rankTowerControl}`
      ].map(unbreak).join(', ')
    }`
    nintendoStats.output_league = {
      pair: [
        `[League Pair]`,
        `Max Power: ${nintendoStats.league.max_league_point_pair},`,
        `Gold Medals: ${nintendoStats.league.pair.gold_count},`,
        `Silver Medals: ${nintendoStats.league.pair.silver_count},`,
        `Bronze Medals: ${nintendoStats.league.pair.bronze_count}`,
      ].map(unbreak).join(' '),
      team: [
        `[League Team]`,
        `Max Power: ${nintendoStats.league.max_league_point_team},`,
        `Gold Medals: ${nintendoStats.league.team.gold_count},`,
        `Silver Medals: ${nintendoStats.league.team.silver_count},`,
        `Bronze Medals: ${nintendoStats.league.team.bronze_count}`,
      ].map(unbreak).join(' ')
    },
    nintendoStats.output_gear = {
      weapon: [
        `[Current Weapon]`,
        `${playerInfo.player.weapon.name.replace(/\s+/g, '\u00A0')}`,
        `(W-L: ${nintendoStats.gear.weapon.stats.win_count}-${nintendoStats.gear.weapon.stats.lose_count},`,
        `Turf Inked: ${nFormatter(nintendoStats.gear.weapon.stats.total_paint_point, 2)})`
      ].map(unbreak).join(' '),
      head: [
        `[Current Headgear]`,
        `${playerInfo.player.head.name} (${'\u2605'.repeat(playerInfo.player.head.rarity + 1)})`,
        `(Main: ${removeParen(playerInfo.player.head_skills.main)},`,
        `Subs: ${playerInfo.player.head_skills.subs.filter(isNotQuestionMark).map(removeParen).join(', ')})`
      ].map(unbreak).join(' '),
      clothes: [
        `[Current Clothes]`,
        `${playerInfo.player.clothes.name} (${'\u2605'.repeat(playerInfo.player.clothes.rarity + 1)})`,
        `(Main: ${removeParen(playerInfo.player.clothes_skills.main)},`,
        `Subs: ${playerInfo.player.clothes_skills.subs.filter(isNotQuestionMark).map(removeParen).join(', ')})`
      ].map(unbreak).join(' '),
      shoes: [
        `[Current Shoes]`,
        `${playerInfo.player.shoes.name} (${'\u2605'.repeat(playerInfo.player.shoes.rarity + 1)})`,
        `(Main: ${removeParen(playerInfo.player.shoes_skills.main)},`,
        `Subs: ${playerInfo.player.shoes_skills.subs.filter(isNotQuestionMark).map(removeParen).join(', ')})`
      ].map(unbreak).join(' '),
    }
    nintendoStats.output_lifetimeWL = unbreak(`[Lifetime W-L] ${nintendoStats.lifetimeWL}`)
    nintendoStats.output_weaponStats = {
      wins: `[Wins] ${nintendoStats.weaponStats.wins.slice(0, 5).map((x, i) => unbreak(`${i + 1}. ${x.name} (${x.win_count})`)).join(', ')}`,
      losses: `[Losses] ${nintendoStats.weaponStats.losses.slice(0, 5).map((x, i) => unbreak(`${i + 1}. ${x.name} (${x.lose_count})`)).join(', ')}`,
      ratio: `[W-L Ratio (min. 20 games)] ${nintendoStats.weaponStats.ratio.filter(x => x.games >= 20).slice(0, 5).map((x, i) => unbreak(`${i + 1}. ${x.name} (${x.record}, ${x.ratio.toFixed(4)})`)).join(', ')}`,
      games: `[Games Played] ${nintendoStats.weaponStats.games.slice(0, 5).map((x, i) => unbreak(`${i + 1}. ${x.name} (${x.games_played})`)).join(', ')}`,
      turf: `[Turf Inked] ${nintendoStats.weaponStats.turf.slice(0, 5).map((x, i) => unbreak(`${i + 1}. ${x.name} (${nFormatter(x.total_paint_point, 2)})`)).join(', ')}`,
      recent: `[Most Recently Used] ${nintendoStats.weaponStats.recent.slice(0, 5).map((x, i) => unbreak(`${i + 1}. ${x.name} (${moment(x.last_use_time).format('YYYY-MM-DD hh:mma')})`)).join(', ')}`
    }
    nintendoStats.output_salmonRun = {
      overall: [
        `[Salmon Run]`,
        `Current Level: ${nintendoStats.salmonRun.current_level},`,
        `Current Points: ${nintendoStats.salmonRun.current_points},`,
        `Lifetime Shifts Played: ${nintendoStats.salmonRun.total_games}`,
      ].map(unbreak).join(' '),
      individual: [
        `[Salmon Run Individual Stats]`,
        `Lifetime Golden Eggs: ${nFormatter(nintendoStats.salmonRun.total_golden_eggs, 2)},`,
        `Lifetime Power Eggs: ${nFormatter(nintendoStats.salmonRun.total_power_eggs, 2)},`,
        `Lifetime Crew Members Rescued: ${nintendoStats.salmonRun.total_rescues}`
      ].map(unbreak).join(' ')
    }
  } catch (e) {
    console.log('** Error retrieving nintendo stats', e)
    nintendoStats = {}
  }
  return res.send(nintendoStats)
}
