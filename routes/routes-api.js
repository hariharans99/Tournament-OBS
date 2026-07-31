
// -----------------------------------------
// Handle Express server routes for the API (at "/api/")
// -----------------------------------------
var express = require("express");
const router = express.Router();
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const directoryPath = path.normalize(config.general.dataroot);
const logger = require('../utils/logger');
logger.debug('API-route loading...');
const spx = require('../utils/spx_server_functions.js');
const xlsx = require('node-xlsx').default;

// --- WATCHOUT!!!! v1.3.3 disabled --------
// const { now } = require("moment");
// const { constants } = require("buffer");

// ROUTES -------------------------------------------------------------------------------------------
router.get('/', function (req, res) {
  res.send('Looking for this <a href="/api/v1/">api/v1</a>?');
});


router.get('/files', async (req, res) => {
  const fileListAsJSON = await GetDataFiles();
  res.send(fileListAsJSON);
}); // file


router.get('/fetchUrl', async (req, res) => {
  let targetUrl = req.query.url;
  try {
    if (!targetUrl) return res.status(400).send('Missing url parameter');
    let axios = require('axios');
    let response = await axios.get(targetUrl, { timeout: 10000 });
    res.setHeader('Content-Type', 'text/plain');
    res.send(response.data);
  } catch (error) {
    logger.error(`Error in /api/fetchUrl (URL: ${targetUrl}): ` + error);
    res.status(500).send(`Error fetching URL (${targetUrl}): ` + error.message);
  }
}); // fetchUrl


// ═══════════════════════════════════════════════════════════════════════════
//  Tournament Standings API  —  GET /api/tournament/standings
//  Query params:
//    sheetId  – Google Sheet ID
//    mode     – "Group Stage" | "Final Stage" | "Group + Final"  (default: Group + Final)
//
//  TotalPoints Sheet (GID 785807032) column layout (0-indexed):
//
//  GROUP STAGE  (cols G-J = indices 6-9):
//    [6]  Team            – team name
//    [7]  Total Points    – sum of all group match placement points
//    [8]  TotalKills      – total kills across all group matches
//    [9]  Total Matches   – matches played in group stage
//
//  FINAL STAGE  (cols Y-AE = indices 24-30, rows 4-19 only = top 16 teams):
//    [24] Team Name       – team name
//    [25] Final 0         – placement pts match 1
//    [26] Final 2         – placement pts match 2
//    [27] Final 3         – placement pts match 3
//    [28] Total Points    – sum of all final placement points
//    [29] Total Matches   – matches played in final stage
//    [30] Total Kills     – total kills across all final matches
// ═══════════════════════════════════════════════════════════════════════════

const _standingsCache = {};
const STANDINGS_CACHE_TTL = 5000; // 5 seconds

const SHEET_GIDS = {
  totalPoints: '785807032'
};

// ── CSV parser ─────────────────────────────────────────────────────────────
function parseCsvText(text) {
  return text.split(/\r\n|\n/).map(line => {
    const result = []; let inQ = false; let cur = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  });
}

// ── Team name validator ────────────────────────────────────────────────────
function isValidTeamName(name) {
  if (!name || typeof name !== 'string') return false;
  const t = name.replace(/^["']|["']$/g, '').trim();
  if (t.length < 2 || t.length > 40) return false;
  const l = t.toLowerCase();
  const RESERVED = ['teams','team name','teamname','team','status','kills','alive',
                    'position','points','rank','#','total','total points','s.no','sno'];
  if (RESERVED.includes(l)) return false;
  if (l.includes('matches') || l.includes('table') || l.includes('registered')) return false;
  if (/[{=<]/.test(t) || /function|null|return/.test(l)) return false;
  return true;
}

// ── Google Sheet CSV fetcher ───────────────────────────────────────────────
async function fetchSheetCsv(axios, sheetId, gid) {
  let url;
  if (sheetId.startsWith('2PACX-')) {
    url = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&gid=${gid}`;
  } else {
    url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  }
  try {
    const resp = await axios.get(url, { timeout: 8000, responseType: 'text' });
    const text = typeof resp.data === 'string' ? resp.data : String(resp.data);
    if (!text || text.startsWith('<!DOCTYPE') || text.startsWith('<html')) return '';
    return text;
  } catch (e) { return ''; }
}

// ── Parse an integer from a CSV cell (default 0) ──────────────────────────
function parseNum(cell) {
  const n = parseInt((cell || '').trim(), 10);
  return isNaN(n) ? 0 : n;
}

// ── Main standings route ───────────────────────────────────────────────────
router.get('/tournament/standings', async (req, res) => {
  try {
    const sheetId = req.query.sheetId || '';
    const mode    = (req.query.mode || 'Group Stage').trim();
    const gid     = req.query.gid || SHEET_GIDS.totalPoints;
    if (!sheetId) return res.status(400).json({ error: 'Missing sheetId' });

    // Serve from cache if fresh
    const cacheKey = `${sheetId}:${mode}:${gid}`;
    const now = Date.now();
    if (_standingsCache[cacheKey] && (now - _standingsCache[cacheKey].ts) < STANDINGS_CACHE_TTL) {
      return res.json(_standingsCache[cacheKey].data);
    }

    const axios = require('axios');
    const rawCsv = await fetchSheetCsv(axios, sheetId, gid);
    if (!rawCsv) return res.status(500).json({ error: 'Could not fetch standings sheet data' });

    const allRows = parseCsvText(rawCsv);

    // ── Locate the data header row (contains "S.NO" in col A) ─────────────
    let hdrFileIdx = -1;
    let ptHeaderRow = null;
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      if (!row || row.length < 2) continue;
      const first = (row[0] || '').trim().toLowerCase();
      if (first === 's.no') { 
        ptHeaderRow = row; 
        hdrFileIdx = i; 
        break; 
      }
    }
    if (hdrFileIdx === -1) {
      return res.status(500).json({ error: 'Cannot find header row (S.NO) in standings sheet' });
    }

    // All actual data rows start after the header
    const dataRows = allRows.slice(hdrFileIdx + 1);

    // ── DYNAMIC COLUMN INDEX DETECTION ─────────────────────────────────────
    let pointsIdx = -1;
    let teamIdx = -1;
    let killsIdx = -1;
    let matchesIdx = -1;

    for (let i = 0; i < ptHeaderRow.length; i++) {
      const cell = ptHeaderRow[i].toLowerCase().trim();
      if (cell === 'total points' || cell === 'points') {
        pointsIdx = i;
      }
    }

    if (pointsIdx !== -1) {
      // Find team index by scanning backwards from pointsIdx - 1
      for (let i = pointsIdx - 1; i >= 0; i--) {
        const cell = ptHeaderRow[i].toLowerCase().trim();
        if (cell === 'team' || cell === 'team name' || cell === 'teams') {
          teamIdx = i;
          break;
        }
      }
    }

    // Find kills and matches indices
    for (let i = 0; i < ptHeaderRow.length; i++) {
      const cell = ptHeaderRow[i].toLowerCase().trim();
      const l = cell.toLowerCase();
      if (l === 'totalkills' || l === 'total kills' || l === 'kills' || l === 'kill') {
        killsIdx = i;
      } else if (l === 'total matches' || l === 'matches' || l === 'matches played') {
        matchesIdx = i;
      }
    }

    // Fallbacks if not detected
    if (pointsIdx === -1) pointsIdx = 7;
    if (teamIdx === -1) teamIdx = 6;
    if (killsIdx === -1) killsIdx = 8;
    if (matchesIdx === -1) matchesIdx = 9;

    const standingsList = [];
    const maxColIdx = Math.max(teamIdx, pointsIdx, killsIdx, matchesIdx);
    for (const row of dataRows) {
      if (!row || row.length <= maxColIdx) continue;
      const name = (row[teamIdx] || '').trim();
      if (!isValidTeamName(name)) continue;
      standingsList.push({
        name,
        points:  parseNum(row[pointsIdx]),
        kills:   parseNum(row[killsIdx]),
        matches: parseNum(row[matchesIdx])
      });
    }

    // ── Sort by points desc, kills desc as tiebreaker ─────────────────────
    standingsList.sort((a, b) => (b.points - a.points) || (b.kills - a.kills));
    standingsList.forEach((t, i) => { t.rank = i + 1; });

    _standingsCache[cacheKey] = { ts: now, data: standingsList };
    res.json(standingsList);

  } catch (err) {
    logger.error('Error in /api/tournament/standings: ' + err);
    res.status(500).json({ error: err.message });
  }
}); // tournament/standings
// ─────────────────────────────────────────────────────────────────────────────




router.get('/openFileFolder/', async (req, res) => {
  // Added in 1.3.1. And fixed in 1.3.2... 
  // Added optional parameter forceFolder to open a different folder than templates.
  if (config.general.disableOpenFolderCommand == true) {
    let msg = 'openFileFolder -command disabled in config.';
    logger.warn(msg);  
    return res.status(403).send(msg);
  }
  let dirpath, folder = null;
  if (req.query.openFolderOnly) {
    folder = path.join(spx.getStartUpFolder(), 'ASSETS', req.query.openFolderOnly);
    // folder = path.dirname(dirpath);
  } else {
    let relpath = req.query.file || '';
    if (!req.query.file) {
      let msg = 'openFileFolder -command requires a file parameter.';
      logger.warn(msg);  
      return res.status(403).send(msg);
    }
    filepath = path.join(spx.getStartUpFolder(), 'ASSETS', 'templates', relpath);
    folder = path.dirname(filepath);
  }

  // Added in 1.3.1 for security: if not found nothing is done.
  if (!fs.existsSync) {
    logger.error('Folder ' + folder + ' does not exist.');
    return res.status(404).send('Folder ' + folder + ' does not exist.');
  }

  // open folder in each operating system
  if (process.platform === 'darwin') {
    require('child_process').exec('open "' + folder + '"');
  } else if (process.platform === 'win32') {
    require('child_process').exec('explorer "' + folder + '"');
  } else if (process.platform === 'linux') {
    require('child_process').exec('xdg-open "' + folder + '"');
  } else {
    logger.error('Unknown operating system: ' + process.platform);
  }
  res.sendStatus(200)
}); // openFileFolder of a template for editing


router.get('/licBasic/', async (req, res) => {
  // added in 1.1.1 - license check. Minor tweaks in 1.1.3
  // Format:
  // 4x?rot(pmac)10x? | AA-AA-33-UQ-GZ-ZX-BB-BB-BB-BB
  // Not safe because it is not encrypted.
  let stripd = req.query.str.replace(/-/g, '');  // strip dashes
  let rotlic = stripd.substring(4,12); // get 8 chars
  // console.log('rotlic // from: ' + rotlic + ' to ' + spx.rot(rotlic, true) + ' vs ' + global.pmac.toUpperCase());
  if (spx.rot(rotlic, true) === global.pmac.toUpperCase()) {
    res.status(200).send('{result:ok}');
  } else {
    res.status(403).send('{result:invalid}');
  }
}); // GET licBasic check ended


router.get('/rotBasic/', async (req, res) => {
  // Require host-id, returns key.
  let rotlic = spx.rot(req.query.id);
  let soclic = spx.dashify(spx.salt(4) + rotlic + spx.salt(8));
  let revlic = spx.rot(rotlic, true);
  let json = "{\"pmac\":\"" + global.pmac + "\",\"rot\":\"" + rotlic + "\",\"soclic\":\"" + soclic + "\",\"chk\":\"" + revlic + "\"}";
  res.send(json);
}); // GET rotBasic/?id=12345678


router.get('/logger/', async (req, res) => {
  // Minimalistic GET logger for template messages
  let message = req.query.message
  let source  = req.query.source
  let level   = req.query.level.toLowerCase()
  let channel = req.query.channel
  let msg = '(api/logger, ' + channel + ', ' + source + '): ' + message
  // console.log(msg);
  eval('logger.' + level + '(msg)'); // nasty, eh?
  res.sendStatus(200)
}); // GET logger route ended


router.post('/logger/', async (req, res) => {
  // Minimalistic POST logger for template messages
  let message = req.body.message
  let source  = req.body.source
  let level   = req.body.level.toLowerCase()
  let channel = req.body.channel
  let msg = '(api/logger, ' + channel + ', ' + source + '): ' + message
  // console.log(msg);
  eval('logger.' + level + '(msg)'); // nasty, eh?
  res.sendStatus(200)
}); // POST logger route ended


router.post('/browseFiles/', async (req, res) => {
  // This is axios ajax handler for file browser on dbl click on a folder
  // REQUEST: current folder and next folder name
  // RETURNS: json data with folder and file arrays
  // 1.1.0 - refactored navigation process to use '..' for parent folder.
  let curFolder   = req.body.curFolder || ".";
  let tgtFolder   = req.body.tgtFolder || "";
  let extension   = req.body.extension || "HTM";
  let rootFolder  = req.body.rootFolder || path.join(spx.getStartUpFolder(), 'ASSETS');
  let BrowseFolder = path.join(curFolder, tgtFolder);

  let osRootPath = path.resolve(rootFolder)
  let osTargPath = path.resolve(BrowseFolder)
  let navigateTo = osTargPath;
  let feedbackMs = '';

  if ( osTargPath.length <= osRootPath.length ) {
    logger.verbose('Targeting beyond limits, sending root-identifier. Path: '  + osTargPath);
    navigateTo = osRootPath;
    feedbackMs = 'root';
  } else {
    feedbackMs = 'ok';
  }
  const fileListAsJSON = await spx.GetFilesAndFolders(navigateTo, extension);
  fileListAsJSON.message=feedbackMs; // force feedback message to UI at RenderFolder()
  res.send(fileListAsJSON);
}); // POST browseFiles API route ended


router.post('/heartbeat/', async (req, res) => {
  // REQUEST: data = a heartbeat string
  // RETURNS: none
  // 1.1.0 submit anonymous usage stats
  try {

    if (global.config.general.allowstats===false || global.config.general.allowstats=='false') {
      logger.verbose('Heartbeat / stats disabled.');
      return
    } // Stats disabled by config. Added in 1.1.1.

    let d = req.body.data;
    let h = 'smartpx.fi';
    spx.collectSPXInfo('hello from api/heartbeat endpoint')
    .then(function(si) {
      let u = 'http://' + h  + '/gc/messageservice2/?'+ si + '&d=' + d;
      spx.httpGet(u);
      return si
    })
    .then(function(si) {
      logger.verbose('Stats ' + si + ' AND ' + d);
      res.status(200).send('{all:good}'); // ok 200 AJAX RESPONSE
      return;
    })
  } catch (error) {
    logger.error('Error in api/heartbeat: ' + error);
    res.status(500).send(error);
  };
  
}); // POST heartbeat 


router.post('/readExcelData', async (req, res) => {
  // Function can be called from a template to get all data from 
  // an Excel file in the ASSETS/excel -folder.
  // Data parsing / logic must be implemented in the template
  // this just dumps data out as-is.
  // var excelFile = path.join(__dirname, '..', 'ASSETS', req.body.filename); // fails when packaged
  // Improved in 1.1.1 - Return cached data also if fileref is empty (for some reason).
  try {
    var excelFile = path.join(spx.getStartUpFolder(), 'ASSETS', req.body.filename); // v.1.0.15: getStartUpFolder()
    var workSheetsData;
    let timenow = Date.now(); 
    // console.log('Excel cache age ' + (timenow - excel.readtime) + ' ms');

    if ( excel.data && excel.filename == req.body.filename && (timenow - excel.readtime) <= 1000 || !req.body.filename ) { /* milliseconds */
      // sama data requested less than a second ago, return data from memory
      logger.verbose('Returning cached Excel data from memory')
      workSheetsData = excel.data;
      // console.log('Returning CACHED Excel data.\n');
    } else {
      // get it from Excel file
      logger.verbose('Returning Excel data from FILE and saving to cache.')
      workSheetsData = xlsx.parse(excelFile);
      // console.log('Returning Excel FILE data and caching it.\n');

      // cache excel data to a global variable
      global.excel.readtime = Date.now();
      global.excel.filename = req.body.filename;
      global.excel.data = workSheetsData;
    }

    
    logger.verbose('OK API read Excel data from ' + excelFile);
    res.status(200).send(workSheetsData); // ok 200 AJAX RESPONSE
    return;
  } catch (error) {
    logger.error('Error in api/readExcelData while reading Excel ' + excelFile + ": " + error);
    res.status(500).send(error);  }; // Server error
    return;
}); // POST readExcelData to get Excel data from file


router.post('/savefile/:filebasename', async (req, res) => {
  spx.talk('Saving file ' + req.params.filebasename);
  try {
    if (!req.params.filebasename) {
      throw new Error("Filename missing, cannot save file.");
    }
    let datafile = path.join(directoryPath, req.params.filebasename) + '.json';
    logger.debug('Saving file ' + datafile + '...');
    let data = req.body;
    await spx.writeFile(datafile,data);
    res.status(200).send('OK, created file ' + datafile); // ok 200 AJAX RESPONSE
  } catch (error) {
    logger.error('Error while saving ' + datafile + ': ' + err);
    res.status(500).send(error);
  }; //file written
}); // POST savefile API route ended

router.post('/saverundownfile/:projectName/:rundownName', async (req, res) => {
  // Added in 1.3.0
  // Used by extensions that will modify rundowns and save them back to the server.
  // This will also send a message to the UI to request a reload.
  console.log('Saving rundown file ' + req.params.rundownName + ' in project ' + req.params.projectName + '...');
  try {
    if (!req.params.projectName || !req.params.rundownName) {
      throw new Error("Project or filename missing from request, cannot save file.");
    }
    let datafile = path.join(directoryPath, req.params.projectName, 'data', req.params.rundownName) + '.json';
    logger.debug('Saving rundown file ' + datafile + '...');
    let data = req.body;
    await spx.writeFile(datafile,data);
    io.emit('SPXMessage2Client', {
      spxcmd: "showMessageSlider",
      msg:    "⛔ Rundown data was modified by API. Reload view!",
      type:   "warn",
      persist: true
    });
    res.status(200).send('OK, created file ' + datafile); // ok 200 AJAX RESPONSE
  } catch (error) {
    logger.error('Error in api/saverundownfile' + error);
    res.status(500).send(error);
  }; //file written
}); // POST savefile API route ended


router.post('/exportCSVfile', async (req, res) => {
  // console.log('Exporting CSV...');
  try {
    let showFolder  = req.body.foldername || "";
    let datafile    = req.body.datafile || "";
    let dataJSONfile= path.join(spx.getDatarootFolder(), showFolder, 'data', datafile + '.json'); // Changed in 1.3.1
    let rundownData = await spx.GetJsonData(dataJSONfile);
    let CSVdata = ''

    let item_description,
        item_playserver,
        item_playchannel,
        item_playlayer,
        item_webplayout,
        item_out,
        item_uicolor,
        item_dataformat,
        item_relpath,
        item_graphicPath,
        item_version,
        item_id

    rundownData.templates.forEach((item,index) => {
      // console.log('Iterating template index ' + index);
      if (item.itemID == req.body.itemID) {
        // This is the template to process.
        // console.log('Exporting template ' + item.itemID);

        item_description = item.description || '';
        item_playserver  = item.playserver  || '';
        item_playchannel = item.playchannel || '1';
        item_playlayer   = item.playlayer || '10';
        item_webplayout  = item.webplayout  || '10';
        item_out         = item.out || 'manual';
        item_uicolor     = item.uicolor || '0';
        item_dataformat  = item.dataformat || 'json';
        item_relpath     = item.relpath || '';        
        // if OGraf, we need to add a few more properties:
        if (item_relpath.toLowerCase().endsWith(".ograf.json")) {
          item_graphicPath = item.ografProps.graphicPath || '';
          item_version     = item.ografProps.version || '';
          item_id          = item.ografProps.id || '';
        }

        CSVdata  = '\r\n# SPX Rundown item CSV export. (More info: https://docs.spxgraphics.com/Guides/Tutorials/how+to+use+csv+files)\r\n\r\n' 
        CSVdata += '# description #;' + item_description + '\r\n' 
        CSVdata += '# playserver #;' + item_playserver + '\r\n'
        CSVdata += '# playchannel #;' + item_playchannel + '\r\n'
        CSVdata += '# playlayer #;' + item_playlayer + '\r\n'
        CSVdata += '# webplayout #;' + item_webplayout + '\r\n'
        CSVdata += '# out #;' + item_out + '\r\n'
        CSVdata += '# uicolor #;' + item_uicolor + '\r\n'
        CSVdata += '# dataformat #;' + item_dataformat + '\r\n'
        CSVdata += '# relpath #;' + item_relpath + '\r\n'        
        // if OGraf, add graphicPath, version and id
        if (item_relpath.toLowerCase().endsWith(".ograf.json")) {
          CSVdata += '# graphicPath #;' + item_graphicPath + '\r\n';
          CSVdata += '# version #;' + item_version + '\r\n';
          CSVdata += '# id #;' + item_id + '\r\n';
        }
        CSVdata += '# onair #;false\r\n'
        CSVdata += '# project #;' + showFolder  + '\r\n'
        CSVdata += '# rundown #;' + datafile  + '\r\n'
        CSVdata += '\r\n'

        // print field ID's
        CSVdata += '# FieldUUIDs #;'
        item.DataFields.forEach((field,findex) => {
          if (field.field && field.field!='' ) {
            CSVdata += field.field + ';'
          }
        });
        CSVdata += '\r\n';

        // print field types
        CSVdata += '# FieldTypes #;'
        item.DataFields.forEach((field,findex) => {
          if (field.field && field.field!='' ) {
            CSVdata += field.ftype + ';'
          }
        });
        CSVdata += '\r\n'

        // print field titles
        CSVdata += '# FieldTitls #;'
        item.DataFields.forEach((field,findex) => {
          if (field.field && field.field!='' ) {
            CSVdata += field.title + ';'
          }
        });
        CSVdata += '\r\n'

        // print field fcalls if button
        CSVdata += '# Fieldfcalls #;'
        item.DataFields.forEach((field,findex) => {
          if (field.field && field.field!='' && field.fcall) {
            CSVdata += field.fcall + ";";
          }

        });
        CSVdata += '\r\n'

        // print field values
        CSVdata += '\r\n'
        let itemData = '# ID:auto;'
        item.DataFields.forEach((field,findex) => {
          if (field.field && field.field!='' && field.value) {
            let dataToSave = field.value.replace(/\n/g,'<BR>') || ''; // replace all newlines with <BR>
            itemData += dataToSave + ";";
          }
        });
        CSVdata += itemData + '\r\n'
      }
    });

    let timestamp  = spx.prettifyDate(new Date(), 'YYYY-MM-DD-HHMMSS');
    let filenameref = item_relpath.split('.')[0].replace('\\', '/').split('/').slice(-1)[0];

    // generate CSV folder if not there
    let CSVfolder = path.join(spx.getStartUpFolder(), 'ASSETS', 'csv')
    fs.existsSync(CSVfolder) || fs.mkdirSync(CSVfolder)
    let CSVfileRef = path.join(CSVfolder, filenameref + '_' + timestamp + '.csv');
    await spx.writeTextFile(CSVfileRef,CSVdata);
    // console.log(' Created CSV file ' + CSVfileRef);
    logger.verbose('Created ' + CSVfileRef + ' from itemID ' + req.body.itemID + ' on ' + dataJSONfile + '. ');
    res.status(200).send('Generated file ' + CSVfileRef);
  } catch (error) {
    logger.error('API error in exportCSVfile(): ', error);
  }; //file written
}); // POST exportCSVfile end


// FUNCTIONS -------------------------------------------------------------------------------------------
async function GetDataFiles() {
  // Get files
  // const directoryPath = path.normalize("X:/01_Projects/Yle/CG/DEV/DATA_FOLDER/");
  const directoryPath = path.normalize(config.general.dataroot);
  let jsonData = {};
  var key = 'files';
  jsonData.folder = directoryPath;
  jsonData[key] = [];
  let id = 0;

  try {
    fs.readdirSync(directoryPath).forEach(file => {
      let ext = path.extname(file).toUpperCase();
      if (ext == ".JSON") {
        var stats = fs.statSync(path.join(directoryPath, file));
        var datem = moment(stats.mtime, 'DD.MM.YYYY').format();
        var filedata = {
          id: id,
          name: file,
          date: datem
        };
        id++;
        jsonData[key].push(filedata);
      }
    });
    return jsonData;
  }
  catch (error) {
    logger.error('Error while reading files from ' + directoryPath + ': ' + err);
    return (error);
  }
} // GetDataFiles ended


module.exports = router;