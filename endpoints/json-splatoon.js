const fs = require('fs')
const requestSplatoon = require('../helpers/request-splatoon')
const moment = require('moment')
const { TOKEN_STORE } = require('../vars')
const nFormatter = require('../helpers/nFormatter')
const unbreak = require('../helpers/unbreak')

module.exports = async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*')
  const splatoonStatsResponse = await requestSplatoon.getRecords((fs.readFileSync(`./${TOKEN_STORE}/splatoon-access`, 'utf8') || '').trim())
  let splatoonStats
  try {
    const playerInfo = {
      player: splatoonStatsResponse.recordsResponse.records.player,
      league_stats: splatoonStatsResponse.recordsResponse.records.league_stats,
      win_count: splatoonStatsResponse.recordsResponse.records.win_count,
      lose_count: splatoonStatsResponse.recordsResponse.records.lose_count,
      weapon_stats: splatoonStatsResponse.recordsResponse.records.weapon_stats,
      x_leaderboard: splatoonStatsResponse.xLeaderboardResponse,
      salmon_run: splatoonStatsResponse.salmonRunResponse
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

    splatoonStats = {
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
          .map(x => ({ name: x.weapon.name, win_count: x.win_count, thumbnail: x.weapon.thumbnail })),
        losses: weaponArray
          .sort((x, y) => y.lose_count - x.lose_count)
          .map(x => ({ name: x.weapon.name, lose_count: x.lose_count, thumbnail: x.weapon.thumbnail })),
        ratio: weaponArray
          .sort((x, y) => (y.win_count/y.lose_count) - (x.win_count/x.lose_count))
          .map(x => ({ name: x.weapon.name, ratio: x.win_count/(x.win_count + x.lose_count), record: `${x.win_count}-${x.lose_count}`, games: x.win_count + x.lose_count, thumbnail: x.weapon.thumbnail })),
        games: weaponArray
          .sort((x, y) => (y.win_count + y.lose_count) - (x.win_count + x.lose_count))
          .map(x => ({ name: x.weapon.name, games_played: x.win_count + x.lose_count, thumbnail: x.weapon.thumbnail })),
        turf: weaponArray
          .sort((x, y) => y.total_paint_point - x.total_paint_point)
          .map(x => ({ name: x.weapon.name, total_paint_point: x.total_paint_point, thumbnail: x.weapon.thumbnail })),
        recent: weaponArray
          .sort((x, y) => y.last_use_time - x.last_use_time)
          .map(x => ({ name: x.weapon.name, last_use_time: moment(x.last_use_time*1000).format(), thumbnail: x.weapon.thumbnail })),
        meter: weaponArray
          .sort((x, y) => y.win_meter - x.win_meter)
          .map(x => ({ name: x.weapon.name, win_meter: x.win_meter, thumbnail: x.weapon.thumbnail })),
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


    const assetsDomain = 'https://app.splatoon2.nintendo.net'
    const escapeImageSingle = (x, imgClass) => `${`scgbimage_${assetsDomain}${x}|srcClassSep|${imgClass}_0_ecgbimage`}`
    const escapeImagesStats = (x, i) => `${`scgbimage_${assetsDomain}${x}|srcClassSep|splatoonweapon_${i}_ecgbimage`}`
    const escapeImagesSkill = (x, i) => `${`scgbimage_${assetsDomain}${x.image}|srcClassSep|splatoonskill_${i + 1}_ecgbimage`}`

    // append all output_ values based on what's splatoonStats already has
    splatoonStats.output_ranks = `[Ranks] ${
      [
        `Rainmaker: ${splatoonStats.ranks.rankRainmaker}`,
        `Splat Zones: ${splatoonStats.ranks.rankSplatZones}`,
        `Clam Blitz: ${splatoonStats.ranks.rankClamBlitz}`,
        `Tower Control: ${splatoonStats.ranks.rankTowerControl}`
      ].map(unbreak).join(', ')
    }`
    splatoonStats.output_league = {
      pair: [
        `[League Pair]`,
        `Max Power: ${splatoonStats.league.max_league_point_pair},`,
        `Gold Medals: ${splatoonStats.league.pair.gold_count},`,
        `Silver Medals: ${splatoonStats.league.pair.silver_count},`,
        `Bronze Medals: ${splatoonStats.league.pair.bronze_count}`,
      ].map(unbreak).join(' '),
      team: [
        `[League Team]`,
        `Max Power: ${splatoonStats.league.max_league_point_team},`,
        `Gold Medals: ${splatoonStats.league.team.gold_count},`,
        `Silver Medals: ${splatoonStats.league.team.silver_count},`,
        `Bronze Medals: ${splatoonStats.league.team.bronze_count}`,
      ].map(unbreak).join(' ')
    },
    splatoonStats.output_gear = {
      weapon: [
        `[Current Weapon]`,
        `${escapeImageSingle(playerInfo.player.weapon.image, 'splatoonweapon')}${playerInfo.player.weapon.name.replace(/\s+/g, '\u00A0')}`,
        `(W-L: ${splatoonStats.gear.weapon.stats.win_count}-${splatoonStats.gear.weapon.stats.lose_count},`,
        `Turf Inked: ${nFormatter(splatoonStats.gear.weapon.stats.total_paint_point, 2)})`
      ].map(unbreak).join(' '),
      head: [
        `[Current Headgear]`,
        `${playerInfo.player.head.name} (${'\u2605'.repeat(playerInfo.player.head.rarity + 1)})`,
        `(Main: ${escapeImageSingle(playerInfo.player.head_skills.main.image, 'splatoonskill')},`,
        `Subs: ${playerInfo.player.head_skills.subs.map(escapeImagesSkill).join(', ')})`
      ].map(unbreak).join(' '),
      clothes: [
        `[Current Clothes]`,
        `${playerInfo.player.clothes.name} (${'\u2605'.repeat(playerInfo.player.clothes.rarity + 1)})`,
        `(Main: ${escapeImageSingle(playerInfo.player.clothes_skills.main.image, 'splatoonskill')},`,
        `Subs: ${playerInfo.player.clothes_skills.subs.map(escapeImagesSkill).join(', ')})`
      ].map(unbreak).join(' '),
      shoes: [
        `[Current Shoes]`,
        `${playerInfo.player.shoes.name} (${'\u2605'.repeat(playerInfo.player.shoes.rarity + 1)})`,
        `(Main: ${escapeImageSingle(playerInfo.player.shoes_skills.main.image, 'splatoonskill')},`,
        `Subs: ${playerInfo.player.shoes_skills.subs.map(escapeImagesSkill).join(', ')})`
      ].map(unbreak).join(' '),
    }
    splatoonStats.output_lifetimeWL = unbreak(`[Lifetime W-L] ${splatoonStats.lifetimeWL}`)
    splatoonStats.output_weaponStats = {
      wins: `[Wins] ${splatoonStats.weaponStats.wins.slice(0, 5).map((x, i) => unbreak(`${i + 1}. ${escapeImagesStats(x.thumbnail, i, 'splatoonweapon')} ${x.name} (${x.win_count})`)).join(', ')}`,
      losses: `[Losses] ${splatoonStats.weaponStats.losses.slice(0, 5).map((x, i) => unbreak(`${i + 1}. ${escapeImagesStats(x.thumbnail, i, 'splatoonweapon')} ${x.name} (${x.lose_count})`)).join(', ')}`,
      ratio: `[W-L Ratio (min. 20 games)] ${splatoonStats.weaponStats.ratio.filter(x => x.games >= 20).slice(0, 5).map((x, i) => unbreak(`${i + 1}. ${escapeImagesStats(x.thumbnail, i, 'splatoonweapon')} ${x.name} (${x.record}, ${x.ratio.toFixed(4)})`)).join(', ')}`,
      games: `[Games Played] ${splatoonStats.weaponStats.games.slice(0, 5).map((x, i) => unbreak(`${i + 1}. ${escapeImagesStats(x.thumbnail, i, 'splatoonweapon')} ${x.name} (${x.games_played})`)).join(', ')}`,
      turf: `[Turf Inked] ${splatoonStats.weaponStats.turf.slice(0, 5).map((x, i) => unbreak(`${i + 1}. ${escapeImagesStats(x.thumbnail, i, 'splatoonweapon')} ${x.name} (${nFormatter(x.total_paint_point, 2)})`)).join(', ')}`,
      recent: `[Most Recently Used] ${splatoonStats.weaponStats.recent.slice(0, 3).map((x, i) => unbreak(`${i + 1}. ${escapeImagesStats(x.thumbnail, i, 'splatoonweapon')} ${x.name} (${moment(x.last_use_time).format('YYYY-MM-DD hh:mma')})`)).join(', ')}`
    }
    splatoonStats.output_salmonRun = {
      overall: [
        `[Salmon Run]`,
        `Current Level: ${splatoonStats.salmonRun.current_level},`,
        `Current Points: ${splatoonStats.salmonRun.current_points},`,
        `Lifetime Shifts Played: ${splatoonStats.salmonRun.total_games}`,
      ].map(unbreak).join(' '),
      individual: [
        `[Salmon Run Individual Stats]`,
        `Lifetime Golden Eggs: ${nFormatter(splatoonStats.salmonRun.total_golden_eggs, 2)},`,
        `Lifetime Power Eggs: ${nFormatter(splatoonStats.salmonRun.total_power_eggs, 2)},`,
        `Lifetime Crew Members Rescued: ${splatoonStats.salmonRun.total_rescues}`
      ].map(unbreak).join(' ')
    }
  } catch (e) {
    console.log('** Error retrieving splatoon stats', e)
    splatoonStats = {}
  }
  return res.send(splatoonStats)
}
