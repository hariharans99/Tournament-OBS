/**
 * GOOGLE APPS SCRIPT FOR AUTOMATIC POINTS & PLACEMENT CALCULATION
 * 
 * Paste this script into Extensions > Apps Script in your Google Sheet.
 * It will run automatically whenever you change the "Alive" column to 0 or empty.
 */

function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  
  // Trigger only on sheets containing the word "Match"
  var sheetName = sheet.getName();
  if (!sheetName.includes("Match")) return;
  
  var row = range.getRow();
  var col = range.getColumn();
  
  // Trigger on edits in Column C (Alive symbols, Col 3) or Column D (Kills, Col 4)
  if (col !== 3 && col !== 4) return;
  
  // Skip headers (rows 1-3)
  if (row < 4) return;
  
  // Team name must be present in Column B (Col 2)
  var teamName = sheet.getRange(row, 2).getValue();
  if (!teamName) return;
  
  updatePoints(sheet);
}

function updatePoints(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 4) return;
  
  var dataRange = sheet.getRange(4, 2, lastRow - 3, 6); // Read columns B to G
  var values = dataRange.getValues();
  
  // 1. Count how many teams are still alive in Column C (index 1 in values array)
  var aliveCount = 0;
  for (var i = 0; i < values.length; i++) {
    var aliveVal = String(values[i][1]).trim();
    var isAlive = (aliveVal !== '0' && aliveVal !== '');
    if (isAlive) {
      aliveCount++;
    }
  }
  
  // 2. Loop through all rows to assign rank & calculate points
  for (var i = 0; i < values.length; i++) {
    var teamName = values[i][0];
    if (!teamName || String(teamName).trim() === "") continue;
    
    var aliveVal = String(values[i][1]).trim();
    var kills = parseInt(values[i][2]) || 0;
    var currentRank = values[i][5]; // Column G (Rank, index 5 in values)
    
    var isAlive = (aliveVal !== '0' && aliveVal !== '');
    var rank = 0;
    
    if (isAlive) {
      // If only 1 team remains alive, they are the Winner (#1)
      if (aliveCount === 1) {
        rank = 1;
      }
    } else {
      // If team is eliminated:
      // Keep their existing rank if it was already recorded
      if (currentRank && String(currentRank).trim() !== "") {
        rank = parseInt(currentRank) || 0;
      } else {
        // Otherwise, calculate their rank: Rank = (Alive Teams Count + 1)
        rank = aliveCount + 1;
      }
    }
    
    // 3. BGMI / PUBG Point Distribution Matrix
    var placementPoints = 0;
    if (rank === 1) placementPoints = 10;
    else if (rank === 2) placementPoints = 6;
    else if (rank === 3) placementPoints = 5;
    else if (rank === 4) placementPoints = 4;
    else if (rank === 5) placementPoints = 3;
    else if (rank === 6) placementPoints = 2;
    else if (rank === 7 || rank === 8) placementPoints = 1;
    
    var totalPoints = kills + placementPoints;
    var sheetRow = i + 4;
    
    // Write calculations back to the sheet
    sheet.getRange(sheetRow, 5).setValue(totalPoints); // Column E (Points)
    
    if (rank > 0) {
      sheet.getRange(sheetRow, 7).setValue(rank); // Column G (Rank)
    } else {
      sheet.getRange(sheetRow, 7).clearContent(); // Column G (Rank)
    }
  }
}
