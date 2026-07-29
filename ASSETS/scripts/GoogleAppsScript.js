/**
 * GOOGLE APPS SCRIPT FOR AUTOMATIC POINTS & PLACEMENT CALCULATION
 * 
 * Paste this script into Extensions > Apps Script in your Google Sheet.
 * It will run automatically whenever you edit columns C (Alive symbols), D (Kills), or F (Alive numeric).
 */

function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  
  // Trigger only on sheets containing the word "Match"
  var sheetName = sheet.getName();
  if (!sheetName.includes("Match")) return;
  
  var row = range.getRow();
  var col = range.getColumn();
  
  // Trigger on Column C (3), Column D (4), or Column F (6)
  if (col !== 3 && col !== 4 && col !== 6) return;
  
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
  
  // Read Columns B (2) to G (7)
  var dataRange = sheet.getRange(4, 2, lastRow - 3, 6);
  var values = dataRange.getValues();
  
  // First pass: Determine how many teams are still alive
  var aliveCount = 0;
  for (var i = 0; i < values.length; i++) {
    var aliveVal = String(values[i][1]).trim();    // Col C
    var aliveNumVal = String(values[i][4]).trim(); // Col F
    
    var isAlive = (aliveVal !== '0' && aliveVal !== '') && (aliveNumVal !== '0' && aliveNumVal !== '');
    if (isAlive) {
      aliveCount++;
    }
  }
  
  // Second pass: Calculate ranks, sync columns, and write points
  for (var i = 0; i < values.length; i++) {
    var teamName = values[i][0];
    if (!teamName || String(teamName).trim() === "") continue;
    
    var aliveVal = String(values[i][1]).trim();
    var aliveNumVal = String(values[i][4]).trim();
    var kills = parseInt(values[i][2]) || 0;
    var currentRank = values[i][5]; // Column G (Rank)
    
    var isAlive = (aliveVal !== '0' && aliveVal !== '') && (aliveNumVal !== '0' && aliveNumVal !== '');
    var rank = 0;
    var sheetRow = i + 4;
    
    if (isAlive) {
      // Sync Col C (symbols) with Col F (numeric)
      var num = parseInt(aliveNumVal) || 0;
      if (num > 0) {
        var currentBars = String(aliveVal).trim();
        var expectedBars = '▌'.repeat(num);
        if (currentBars !== expectedBars) {
          sheet.getRange(sheetRow, 3).setValue(expectedBars);
        }
      }
      
      // If only 1 team is left alive, they are Rank #1
      if (aliveCount === 1) {
        rank = 1;
      }
    } else {
      // If eliminated, sync Col C to empty and Col F to 0
      if (aliveVal !== '' || aliveNumVal !== '0') {
        sheet.getRange(sheetRow, 3).setValue('');
        sheet.getRange(sheetRow, 6).setValue(0);
      }
      
      // Use existing rank if set, otherwise assign rank based on aliveCount
      if (currentRank && String(currentRank).trim() !== "") {
        rank = parseInt(currentRank) || 0;
      } else {
        rank = aliveCount + 1;
      }
    }
    
    // BGMI/PUBG Point Matrix: #1=10, #2=6, #3=5, #4=4, #5=3, #6=2, #7-#8=1, rest=0
    var placementPoints = 0;
    if (rank === 1) placementPoints = 10;
    else if (rank === 2) placementPoints = 6;
    else if (rank === 3) placementPoints = 5;
    else if (rank === 4) placementPoints = 4;
    else if (rank === 5) placementPoints = 3;
    else if (rank === 6) placementPoints = 2;
    else if (rank === 7 || rank === 8) placementPoints = 1;
    
    var totalPoints = kills + placementPoints;
    
    // Write total points to Column E (Points)
    sheet.getRange(sheetRow, 5).setValue(totalPoints);
    
    // Write rank to Column G (Rank)
    if (rank > 0) {
      sheet.getRange(sheetRow, 7).setValue(rank);
    } else {
      sheet.getRange(sheetRow, 7).clearContent();
    }
  }
}
