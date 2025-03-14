const fs = require("fs");
const path = require("path");

export function generateHTMLReport(data: any) {
  // Tính toán group trung bình và count
  const grouped: any = {};
  data.random.forEach((entry: any) => {
    if (!grouped[entry.configName])
      grouped[entry.configName] = { count: 0, sum: 0 };
    grouped[entry.configName].count++;
    grouped[entry.configName].sum += entry.actualValue;
  });

  const randomRows = data.random
    .map((entry: any) => {
      const avg = (
        grouped[entry.configName].sum / grouped[entry.configName].count
      ).toFixed(2);
      return `
      <tr>
        <td>${entry.configName}</td>
        <td>${entry.configValue}</td>
        <td>${entry.actualValue.toFixed(2)}</td>
        <td>${entry.result}</td>
        <td>${grouped[entry.configName].count}</td>
        <td>${avg}</td>
      </tr>`;
    })
    .join("");

  const stateRows = data.stateTransition
    .map((t: any) => `<tr><td>${t.stateFrom}</td><td>${t.stateTo}</td></tr>`)
    .join("");

  const activityRows = data.activities
    .map(
      (a: any) =>
        `<tr><td>${a.action}</td><td>${a.source}</td><td>${
          a.data?.title || ""
        }</td></tr>`
    )
    .join("");

  const errorList = data.error.map((e: any) => `<li>${e}</li>`).join("");

  const summaryRows = Object.entries(data.summary)
    .filter(([k, v]) => typeof v !== "object")
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join("");

  // Tính thời gian kết thúc và duration
  const start = new Date(data.summary.startTime);
  const durationMin = parseInt(data.summary.duration.minutes);
  const durationSec = parseInt(data.summary.duration.ms);
  const end = new Date(data.summary.endTime);

  const timingRow = `<tr><td>${start.toLocaleString()}</td><td>${end.toLocaleString()}</td><td>${durationMin} minutes ${durationSec} seconds</td></tr>`;

  const interactionRows = Object.entries(data.summary.interactions)
    .map(([type, count]) => `<tr><td>${type}</td><td>${count}</td></tr>`)
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Youtube Simulation Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f9f9f9; }
    h2 { background-color: #4CAF50; color: white; padding: 10px; border-radius: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #e0e0e0; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h2>📊 Random Probability Results</h2>
  <table>
    <thead>
      <tr>
        <th>Config Name</th>
        <th>Config Value</th>
        <th>Actual Value</th>
        <th>Result</th>
        <th>Count</th>
        <th>Average Actual Value</th>
      </tr>
    </thead>
    <tbody>
      ${randomRows}
    </tbody>
  </table>

  <h2>🔁 State Transitions</h2>
  <table>
    <thead><tr><th>From State</th><th>To State</th></tr></thead>
    <tbody>${stateRows}</tbody>
  </table>

  <h2>⚙️ Activities</h2>
  <table>
    <thead><tr><th>Action</th><th>Source</th><th>Data</th></tr></thead>
    <tbody>${activityRows}</tbody>
  </table>

  <h2>❌ Errors</h2>
  <ul>${errorList}</ul>

  <h2>📈 Session Summary</h2>
  <table>
    <thead><tr><th>Field</th><th>Value</th></tr></thead>
    <tbody>${summaryRows}</tbody>
  </table>

  <h2>🕒 Session Timing</h2>
  <table>
    <thead><tr><th>Start Time</th><th>End Time</th><th>Duration</th></tr></thead>
    <tbody>${timingRow}</tbody>
  </table>

  <h2>✨ Interactions</h2>
  <table>
    <thead><tr><th>Type</th><th>Count</th></tr></thead>
    <tbody>${interactionRows}</tbody>
  </table>
</body>
</html>
  `;

  return html;
}
