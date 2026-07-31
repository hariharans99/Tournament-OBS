// --- Tournament Score Calculator -------------------------------------------
// Triggers: Column D (Kills) or Column F (Alive Number) changes
// Sheets  : Any sheet containing "Match" OR "Final" in its name
// Writes  : Column E (Points = Kills + Placement), Column G (Position Eliminated)
//
// HOW TO INSTALL:
//   1. Open your Google Sheet
//   2. Go to Extensions -> Apps Script
//   3. Replace all existing code with this file
//   4. Save (Ctrl+S)
// -----------------------------------------------------------------------------

// Placement points by finishing position (index = rank, index 0 unused)
const PLACEMENT_POINTS = [0, 15, 12, 10, 8, 6, 4, 2, 1, 1, 1, 1, 1];
// 1st = 15pts, 2nd = 12pts, 3rd = 10pts, 4th = 8pts, 5th = 6pts,
// 6th = 4pts, 7th = 2pts, 8th-12th = 1pt each

function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var name  = sheet.getName();

  // Fire only on Final1, Final2, or Final3 sheets (ignoring spaces and casing)
  var cleanName = name.replace(/\s+/g, '').toLowerCase();
  if (cleanName !== "final1" && cleanName !== "final2" && cleanName !== "final3") return;

  var col = e.range.getColumn();
  var row = e.range.getRow();

  // Only react to Column D (Kills = col 4) or Column F (Alive Number = col 6)
  if (col !== 4 && col !== 6) return;

  // Skip header rows
  if (row < 4) return;

  // Skip if no team name in Col B
  if (!sheet.getRange(row, 2).getValue()) return;

  recalcAll(sheet);
}

function recalcAll(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 4) return;

  var numRows = lastRow - 3;

  // Read B(Team) | C(Alive symbols) | D(Kills) | E(Points) | F(Alive Num) | G(Rank)
  var data = sheet.getRange(4, 2, numRows, 6).getValues();

  // Step 1: Count how many teams are currently alive (Col F > 0)
  var aliveCount = 0;
  for (var i = 0; i < data.length; i++) {
    if (!String(data[i][0]).trim()) continue;
    if ((parseInt(data[i][4]) || 0) > 0) aliveCount++;
  }

  // Step 2: Calculate points and assign ranks
  var updates = []; // Batch: [[row, col, value], ...]

  for (var i = 0; i < data.length; i++) {
    var teamName = String(data[i][0]).trim();
    if (!teamName) continue;

    var kills    = parseInt(data[i][2]) || 0;  // Col D
    var aliveNum = parseInt(data[i][4]) || 0;  // Col F
    var rank     = parseInt(data[i][5]) || 0;  // Col G (existing rank)
    var sheetRow = i + 4;

    if (aliveNum > 0) {
      // Team is ALIVE: only kill points, no placement bonus yet
      if (rank > 0) {
        updates.push([sheetRow, 7, '']); // Clear any wrongly set rank in Col G
      }
      updates.push([sheetRow, 5, kills]); // Col E = kills only

    } else {
      // Team is ELIMINATED (Alive = 0 or blank)
      if (rank === 0) {
        // Assign elimination rank based on current alive count
        rank = aliveCount + 1;
        updates.push([sheetRow, 7, rank]); // Col G = rank
      }

      // Look up placement bonus (safe fallback to 0 if rank > table length)
      var placePts = PLACEMENT_POINTS[rank] || 0;
      updates.push([sheetRow, 5, kills + placePts]); // Col E = kills + placement
    }
  }

  // Apply all updates in a single batch (fewer Sheets API round-trips)
  for (var j = 0; j < updates.length; j++) {
    sheet.getRange(updates[j][0], updates[j][1]).setValue(updates[j][2]);
  }
}
