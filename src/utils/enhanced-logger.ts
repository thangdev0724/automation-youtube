// src/utils/enhanced-logger.ts
import winston from "winston";
import fs from "fs";
import path from "path";
import { logger } from "./logger";

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  meta?: {
    type:
      | "state_transition"
      | "random_value"
      | "action"
      | "config"
      | "event"
      | "error"
      | "controller";
    category?: string;
    functionName?: string;
    result?: any;
    fromState?: string;
    toState?: string;
    probability?: number;
    actualValue?: number;
    sessionInfo?: any;
    configName?: string;
    configValue?: any;
    controllerName?: string;
    methodName?: string;
  };
}

class EnhancedLogger {
  private logEntries: LogEntry[] = [];
  private logDirectory: string;
  private sessionId: string;
  private sessionStartTime: Date;
  private configValues: Record<string, any> = {};

  constructor() {
    this.sessionStartTime = new Date();
    this.sessionId = `session_${this.sessionStartTime
      .toISOString()
      .replace(/[:.]/g, "-")}`;
    this.logDirectory = path.join(process.cwd(), "logs", "reports");

    // Ensure the log directory exists
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }

    logger.info("Enhanced logger initialized", { sessionId: this.sessionId });
  }

  /**
   * Log a random value result with associated configuration
   */
  logRandomValue(
    functionName: string,
    params: any,
    result: any,
    category: string = "random",
    configName?: string,
    configValue?: any
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message: `Random value from ${functionName}: ${result}`,
      data: params,
      meta: {
        type: "random_value",
        category,
        functionName,
        result,
        configName,
        configValue,
      },
    };

    this.logEntries.push(entry);
    logger.debug(`Random value: ${functionName}`, {
      params,
      result,
      configName,
      configValue:
        configValue !== undefined
          ? typeof configValue === "object"
            ? "Complex object"
            : configValue
          : undefined,
    });
  }

  /**
   * Log a state transition
   */
  logStateTransition(fromState: string, toState: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message: `State transition: ${fromState} -> ${toState}`,
      data,
      meta: {
        type: "state_transition",
        fromState,
        toState,
      },
    };

    this.logEntries.push(entry);
    logger.info(`State transition: ${fromState} -> ${toState}`, data);
  }

  /**
   * Log a probability check with configuration context
   */
  logProbabilityCheck(
    functionName: string,
    probability: number,
    actualValue: number,
    result: boolean,
    category: string = "probability",
    configName?: string,
    configSection?: string,
    configContext?: any
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message: `Probability check: ${probability}%, rolled: ${actualValue.toFixed(
        2
      )}, result: ${result}`,
      data: configContext,
      meta: {
        type: "random_value",
        category,
        functionName,
        result,
        probability,
        actualValue,
        configName,
        configValue: {
          section: configSection,
          value: probability,
          context: configContext,
        },
      },
    };

    this.logEntries.push(entry);
    logger.debug(`Probability check: ${probability}%`, {
      rolled: actualValue.toFixed(2),
      result,
      functionName,
      configName,
      configSection,
    });
  }

  /**
   * Log a controller method call
   */
  logControllerMethod(
    controllerName: string,
    methodName: string,
    params?: any,
    result?: any,
    configUsed?: any
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message: `Controller: ${controllerName}.${methodName}`,
      data: { params, result },
      meta: {
        type: "controller",
        category: "controller",
        controllerName,
        methodName,
        configValue: configUsed,
      },
    };

    this.logEntries.push(entry);
    logger.debug(`Controller method: ${controllerName}.${methodName}`, {
      params: params ? "Provided" : "None",
      result: result ? "Returned" : "None",
      configSummary: configUsed ? "Config used" : "No config",
    });
  }

  /**
   * Log an action being performed
   */
  logAction(
    action: string,
    data?: any,
    category: string = "action",
    configUsed?: any
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message: `Action: ${action}`,
      data,
      meta: {
        type: "action",
        category,
        functionName: action,
        configValue: configUsed,
      },
    };

    this.logEntries.push(entry);
    logger.info(`Action: ${action}`, data);
  }

  /**
   * Log configuration values
   */
  logConfig(configName: string, configData: any): void {
    // Store config for later reference
    this.configValues[configName] = configData;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message: `Configuration: ${configName}`,
      data: configData,
      meta: {
        type: "config",
        category: "configuration",
        functionName: configName,
        configName,
        configValue: configData,
      },
    };

    this.logEntries.push(entry);
    logger.debug(`Configuration loaded: ${configName}`, {
      configSummary: "Config loaded successfully",
    });
  }

  /**
   * Get a specific configuration value
   */
  getConfigValue(configName: string, propertyPath?: string): any {
    const config = this.configValues[configName];
    if (!config) return undefined;

    if (!propertyPath) return config;

    // Handle property path like "home.homeToSearch"
    const parts = propertyPath.split(".");
    let value = config;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }

    return value;
  }

  /**
   * Log session information
   */
  logSessionInfo(sessionInfo: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Session information",
      data: sessionInfo,
      meta: {
        type: "event",
        category: "session",
        sessionInfo,
      },
    };

    this.logEntries.push(entry);
    logger.info("Session information updated", sessionInfo);
  }

  /**
   * Log an error
   */
  logError(message: string, error: any, category: string = "error"): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      data: error,
      meta: {
        type: "error",
        category,
      },
    };

    this.logEntries.push(entry);
    logger.error(message, { error });
  }

  /**
   * Generate an HTML report from the log entries
   */
  generateHTMLReport(): string {
    const sessionDuration = this.calculateSessionDuration();
    const randomValuesSummary = this.summarizeRandomValues();
    const stateTransitions = this.getStateTransitions();
    const actionsPerformed = this.summarizeActions();
    const errorsSummary = this.summarizeErrors();
    const controllerCalls = this.summarizeControllerCalls();

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Automation Report - ${this.sessionId}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1440px;
            margin: 0 auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        .header {
            background-color: #3498db;
            color: white;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 5px;
            text-align: center;
        }
        .session-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 5px solid #3498db;
        }
        .card {
            background-color: #fff;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            overflow: hidden;
        }
        .card-header {
            background-color: #2c3e50;
            color: white;
            padding: 10px 15px;
            font-weight: bold;
        }
        .card-body {
            padding: 15px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        th, td {
            padding: 12px 15px;
            border-bottom: 1px solid #ddd;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
            color: white;
        }
        .badge-info {
            background-color: #3498db;
        }
        .badge-success {
            background-color: #2ecc71;
        }
        .badge-warning {
            background-color: #f1c40f;
        }
        .badge-danger {
            background-color: #e74c3c;
        }
        .stats-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .stat-card {
            flex: 1;
            min-width: 200px;
            margin: 10px;
            padding: 15px;
            background-color: #fff;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
            color: #3498db;
        }
        .stat-label {
            color: #7f8c8d;
            font-size: 14px;
        }
        .chart-container {
            margin-bottom: 30px;
        }
        pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        code {
            font-family: Consolas, Monaco, 'Andale Mono', monospace;
            color: #e83e8c;
        }
        .log-entry {
            padding: 10px;
            margin-bottom: 5px;
            border-radius: 4px;
        }
        .log-entry:nth-child(odd) {
            background-color: #f8f9fa;
        }
        .log-time {
            color: #6c757d;
            font-size: 0.85em;
        }
        .state-transition-diagram {
            margin: 20px 0;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
            overflow-x: auto;
        }
        /* Tab styles */
        .tabs {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }
        .tab-button {
            padding: 10px 20px;
            background-color: #f8f9fa;
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }
        .tab-button.active {
            border-bottom: 2px solid #3498db;
            color: #3498db;
        }
        .tab-content {
            display: none;
            padding: 20px;
            border-top: 1px solid #ddd;
            animation: fadeIn 0.5s;
        }
        .tab-content.active {
            display: block;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .config-comparison {
            display: flex;
            background-color: #f9f9f9;
            border-radius: 4px;
            margin-bottom: 10px;
            padding: 8px;
        }
        .config-value {
            flex: 1;
            padding: 4px 8px;
            text-align: center;
        }
        .actual-value {
            flex: 1;
            padding: 4px 8px;
            text-align: center;
            border-left: 1px solid #ddd;
        }
        .match {
            background-color: #d4edda;
        }
        .mismatch {
            background-color: #f8d7da;
        }
        
        /* Search box */
        .search-container {
            margin-bottom: 20px;
        }
        .search-box {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            box-sizing: border-box;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>YouTube Automation Report</h1>
            <p>Session ID: ${this.sessionId}</p>
        </div>

        <div class="session-info">
            <h2>Session Summary</h2>
            <p><strong>Start Time:</strong> ${this.sessionStartTime.toLocaleString()}</p>
            <p><strong>Duration:</strong> ${sessionDuration}</p>
        </div>

        <div class="tabs">
            <button class="tab-button active" onclick="openTab(event, 'overview')">Overview</button>
            <button class="tab-button" onclick="openTab(event, 'random-values')">Random Values</button>
            <button class="tab-button" onclick="openTab(event, 'controllers')">Controller Calls</button>
            <button class="tab-button" onclick="openTab(event, 'state-transitions')">State Transitions</button>
            <button class="tab-button" onclick="openTab(event, 'actions')">Actions</button>
            <button class="tab-button" onclick="openTab(event, 'config')">Configuration</button>
            <button class="tab-button" onclick="openTab(event, 'errors')">Errors</button>
            <button class="tab-button" onclick="openTab(event, 'raw-logs')">Raw Logs</button>
        </div>

        <!-- Overview Tab -->
        <div id="overview" class="tab-content active">
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-label">State Transitions</div>
                    <div class="stat-value">${stateTransitions.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Actions Performed</div>
                    <div class="stat-value">${this.countActions()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Random Decisions</div>
                    <div class="stat-value">${this.countRandomValues()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Controller Calls</div>
                    <div class="stat-value">${this.countControllerCalls()}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Errors</div>
                    <div class="stat-value">${this.countErrors()}</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">State Transition Flow</div>
                <div class="card-body">
                    <div class="state-transition-diagram">
                        <pre>${this.generateStateTransitionText()}</pre>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Top Actions Performed</div>
                <div class="card-body">
                    <table>
                        <thead>
                            <tr>
                                <th>Action</th>
                                <th>Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateTopActionsHTML(5)}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">Most Used Controllers</div>
                <div class="card-body">
                    <table>
                        <thead>
                            <tr>
                                <th>Controller</th>
                                <th>Count</th>
                                <th>Methods</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateTopControllersHTML(5)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Random Values Tab -->
        <div id="random-values" class="tab-content">
            <div class="search-container">
                <input type="text" id="probabilitySearchBox" class="search-box" placeholder="Search by config name, function, or value..." onkeyup="searchProbability()">
            </div>
            <div class="card">
                <div class="card-header">Probability Checks with Configuration Comparison</div>
                <div class="card-body">
                    <table id="probabilityTable">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Config Name</th>
                                <th>Property</th>
                                <th>Expected Value</th>
                                <th>Actual Value</th>
                                <th>Result</th>
                                <th>Origin</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateProbabilityWithConfigHTML()}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Probability Checks Summary</div>
                <div class="card-body">
                    <table>
                        <thead>
                            <tr>
                                <th>Config Name</th>
                                <th>Property</th>
                                <th>Expected Value</th>
                                <th>Success Rate</th>
                                <th>Count</th>
                                <th>Avg Rolled Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateProbabilityChecksHTML()}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Random Values Log</div>
                <div class="card-body">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Function</th>
                                <th>Parameters</th>
                                <th>Result</th>
                                <th>Config</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateRandomValuesTableHTML()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Controllers Tab -->
        <div id="controllers" class="tab-content">
            <div class="search-container">
                <input type="text" id="controllerSearchBox" class="search-box" placeholder="Search controllers..." onkeyup="searchControllers()">
            </div>
            <div class="card">
                <div class="card-header">Controller Method Calls</div>
                <div class="card-body">
                    <table id="controllerTable">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Controller</th>
                                <th>Method</th>
                                <th>Parameters</th>
                                <th>Config Used</th>
                                <th>Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateControllerCallsHTML()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- State Transitions Tab -->
        <div id="state-transitions" class="tab-content">
            <div class="card">
                <div class="card-header">State Transitions</div>
                <div class="card-body">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>From State</th>
                                <th>To State</th>
                                <th>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateStateTransitionsTableHTML()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Actions Tab -->
        <div id="actions" class="tab-content">
            <div class="card">
                <div class="card-header">Actions Performed</div>
                <div class="card-body">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Action</th>
                                <th>Details</th>
                                <th>Config Used</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateActionsTableHTML()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Configuration Tab -->
        <div id="config" class="tab-content">
            <div class="card">
                <div class="card-header">Loaded Configurations</div>
                <div class="card-body">
                    <div class="tabs">
                        ${Object.keys(this.configValues)
                          .map(
                            (configName, index) =>
                              `<button class="tab-button ${
                                index === 0 ? "active" : ""
                              }" 
                             onclick="openConfigTab(event, 'config-${configName}')">${configName}</button>`
                          )
                          .join("")}
                    </div>
                    
                    ${Object.keys(this.configValues)
                      .map(
                        (configName, index) =>
                          `<div id="config-${configName}" class="tab-content ${
                            index === 0 ? "active" : ""
                          }">
                            <h3>${configName}</h3>
                            <pre>${JSON.stringify(
                              this.configValues[configName],
                              null,
                              2
                            )}</pre>
                        </div>`
                      )
                      .join("")}
                </div>
            </div>
        </div>

        <!-- Errors Tab -->
        <div id="errors" class="tab-content">
            <div class="card">
                <div class="card-header">Errors</div>
                <div class="card-body">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Message</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateErrorsTableHTML()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Raw Logs Tab -->
        <div id="raw-logs" class="tab-content">
            <div class="card">
                <div class="card-header">All Log Entries</div>
                <div class="card-body">
                    <pre>${JSON.stringify(this.logEntries, null, 2)}</pre>
                </div>
            </div>
        </div>
    </div>

    <script>
        function openTab(evt, tabName) {
            var i, tabContent, tabButtons;
            
            // Hide all tab content
            tabContent = document.getElementsByClassName("tab-content");
            for (i = 0; i < tabContent.length; i++) {
                tabContent[i].classList.remove("active");
            }
            
            // Remove active class from all tab buttons
            tabButtons = document.getElementsByClassName("tab-button");
            for (i = 0; i < tabButtons.length; i++) {
                tabButtons[i].classList.remove("active");
            }
            
            // Show the selected tab and add active class to the button
            document.getElementById(tabName).classList.add("active");
            evt.currentTarget.classList.add("active");
        }
        
        function openConfigTab(evt, tabName) {
            var i, tabContent, tabButtons;
            
            // Get all elements with class="tab-content" inside the config tab
            tabContent = document.querySelectorAll("#config .tab-content");
            for (i = 0; i < tabContent.length; i++) {
                tabContent[i].classList.remove("active");
            }
            
            // Get all elements with class="tab-button" inside the config tab
            tabButtons = document.querySelectorAll("#config .tab-button");
            for (i = 0; i < tabButtons.length; i++) {
                tabButtons[i].classList.remove("active");
            }
            
            // Show the selected tab and add active class to the button
            document.getElementById(tabName).classList.add("active");
            evt.currentTarget.classList.add("active");
        }
        
        function searchProbability() {
            var input, filter, table, tr, td, i, j, txtValue, found;
            input = document.getElementById("probabilitySearchBox");
            filter = input.value.toUpperCase();
            table = document.getElementById("probabilityTable");
            tr = table.getElementsByTagName("tr");

            // Loop through all table rows except the header
            for (i = 1; i < tr.length; i++) {
                found = false;
                
                // Check all columns in the row
                for (j = 0; j < tr[i].cells.length; j++) {
                    td = tr[i].cells[j];
                    if (td) {
                        txtValue = td.textContent || td.innerText;
                        if (txtValue.toUpperCase().indexOf(filter) > -1) {
                            found = true;
                            break;
                        }
                    }
                }
                
                // Show or hide the row based on search
                if (found) {
                    tr[i].style.display = "";
                } else {
                    tr[i].style.display = "none";
                }
            }
        }
        
        function searchControllers() {
            var input, filter, table, tr, i, j, txtValue, found;
            input = document.getElementById("controllerSearchBox");
            filter = input.value.toUpperCase();
            table = document.getElementById("controllerTable");
            tr = table.getElementsByTagName("tr");

            // Loop through all table rows except the header
            for (i = 1; i < tr.length; i++) {
                found = false;
                
                // Check controller and method columns
                for (j = 1; j < 3; j++) {
                    td = tr[i].cells[j];
                    if (td) {
                        txtValue = td.textContent || td.innerText;
                        if (txtValue.toUpperCase().indexOf(filter) > -1) {
                            found = true;
                            break;
                        }
                    }
                }
                
                // Show or hide the row based on search
                if (found) {
                    tr[i].style.display = "";
                } else {
                    tr[i].style.display = "none";
                }
            }
        }
    </script>
</body>
</html>
    `;

    return htmlContent;
  }

  /**
   * Save the HTML report to a file
   */
  saveHTMLReport(): string {
    const htmlContent = this.generateHTMLReport();
    const reportFilename = `${this.sessionId}_report.html`;
    const reportPath = path.join(this.logDirectory, reportFilename);

    fs.writeFileSync(reportPath, htmlContent);
    logger.info(`HTML report saved to: ${reportPath}`);

    return reportPath;
  }

  /**
   * Save the raw log entries to a JSON file
   */
  saveRawLogs(): string {
    const jsonFilename = `${this.sessionId}_logs.json`;
    const jsonPath = path.join(this.logDirectory, jsonFilename);

    fs.writeFileSync(jsonPath, JSON.stringify(this.logEntries, null, 2));
    logger.info(`Raw logs saved to: ${jsonPath}`);

    return jsonPath;
  }

  // Helper methods for report generation

  private calculateSessionDuration(): string {
    const now = new Date();
    const durationMs = now.getTime() - this.sessionStartTime.getTime();

    const seconds = Math.floor((durationMs / 1000) % 60);
    const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
    const hours = Math.floor(durationMs / (1000 * 60 * 60));

    return `${hours}h ${minutes}m ${seconds}s`;
  }

  private summarizeRandomValues(): any {
    const randomEntries = this.logEntries.filter(
      (entry) => entry.meta?.type === "random_value"
    );

    const summary: any = {};

    randomEntries.forEach((entry) => {
      const funcName = entry.meta?.functionName || "unknown";

      if (!summary[funcName]) {
        summary[funcName] = {
          count: 0,
          values: [],
          sum: 0,
          configReferences: {},
        };
      }

      summary[funcName].count++;
      if (typeof entry.meta?.result === "number") {
        summary[funcName].values.push(entry.meta.result);
        summary[funcName].sum += entry.meta.result;
      }

      // Track config references
      if (entry.meta?.configName) {
        const configName = entry.meta.configName;
        if (!summary[funcName].configReferences[configName]) {
          summary[funcName].configReferences[configName] = 0;
        }
        summary[funcName].configReferences[configName]++;
      }
    });

    // Calculate averages
    Object.keys(summary).forEach((key) => {
      if (summary[key].values.length > 0) {
        summary[key].average = summary[key].sum / summary[key].values.length;
      }
    });

    return summary;
  }

  private getStateTransitions(): LogEntry[] {
    return this.logEntries.filter(
      (entry) => entry.meta?.type === "state_transition"
    );
  }

  private summarizeActions(): any {
    const actionEntries = this.logEntries.filter(
      (entry) => entry.meta?.type === "action"
    );

    const summary: any = {};

    actionEntries.forEach((entry) => {
      const actionName = entry.meta?.functionName || "unknown";

      if (!summary[actionName]) {
        summary[actionName] = {
          count: 0,
          entries: [],
        };
      }

      summary[actionName].count++;
      summary[actionName].entries.push(entry);
    });

    return summary;
  }

  private summarizeControllerCalls(): any {
    const controllerEntries = this.logEntries.filter(
      (entry) => entry.meta?.type === "controller"
    );

    const summary: any = {};

    controllerEntries.forEach((entry) => {
      const controllerName = entry.meta?.controllerName || "unknown";
      const methodName = entry.meta?.methodName || "unknown";

      if (!summary[controllerName]) {
        summary[controllerName] = {
          count: 0,
          methods: {},
          entries: [],
        };
      }

      summary[controllerName].count++;
      summary[controllerName].entries.push(entry);

      // Track method calls
      if (!summary[controllerName].methods[methodName]) {
        summary[controllerName].methods[methodName] = 0;
      }
      summary[controllerName].methods[methodName]++;
    });

    return summary;
  }

  private summarizeErrors(): any {
    return this.logEntries.filter((entry) => entry.meta?.type === "error");
  }

  private countRandomValues(): number {
    return this.logEntries.filter(
      (entry) => entry.meta?.type === "random_value"
    ).length;
  }

  private countActions(): number {
    return this.logEntries.filter((entry) => entry.meta?.type === "action")
      .length;
  }

  private countControllerCalls(): number {
    return this.logEntries.filter((entry) => entry.meta?.type === "controller")
      .length;
  }

  private countErrors(): number {
    return this.logEntries.filter((entry) => entry.meta?.type === "error")
      .length;
  }

  private generateRandomValuesTableHTML(): string {
    const randomEntries = this.logEntries.filter(
      (entry) =>
        entry.meta?.type === "random_value" &&
        entry.meta?.category !== "probability"
    );
    if (randomEntries.length === 0) {
      return `
      <tr>
        <td colspan="5" style="text-align: center;">No random values recorded</td>
      </tr>
    `;
    }

    return randomEntries
      .map(
        (entry) => `
    <tr>
      <td>${new Date(entry.timestamp).toLocaleTimeString()}</td>
      <td>${entry.meta?.functionName || "unknown"}</td>
      <td>${JSON.stringify(entry.data || {})}</td>
      <td>${JSON.stringify(entry.meta?.result || "N/A")}</td>
      <td>${entry.meta?.configName || "N/A"}</td>
    </tr>
  `
      )
      .join("");
  }

  private generateProbabilityWithConfigHTML(): string {
    const probEntries = this.logEntries.filter(
      (entry) =>
        entry.meta?.type === "random_value" &&
        entry.meta?.category === "probability"
    );

    if (probEntries.length === 0) {
      return `
      <tr>
        <td colspan="7" style="text-align: center;">No probability checks recorded</td>
      </tr>
    `;
    }

    return probEntries
      .map((entry) => {
        const configName = entry.meta?.configName || "N/A";
        const configSection = entry.meta?.configValue?.section || "N/A";
        const expectedValue =
          entry.meta?.probability !== undefined
            ? `${entry.meta.probability}%`
            : "N/A";
        const actualValue =
          entry.meta?.actualValue !== undefined
            ? `${entry.meta.actualValue.toFixed(2)}%`
            : "N/A";
        const result =
          entry.meta?.result === true
            ? `<span class="badge badge-success">Success</span>`
            : `<span class="badge badge-danger">Failed</span>`;

        return `
      <tr>
        <td>${new Date(entry.timestamp).toLocaleTimeString()}</td>
        <td>${configName}</td>
        <td>${configSection}</td>
        <td>${expectedValue}</td>
        <td>${actualValue}</td>
        <td>${result}</td>
        <td>${entry.meta?.functionName || "unknown"}</td>
      </tr>
    `;
      })
      .join("");
  }

  private generateStateTransitionsTableHTML(): string {
    const stateEntries = this.getStateTransitions();

    if (stateEntries.length === 0) {
      return `
      <tr>
        <td colspan="4" style="text-align: center;">No state transitions recorded</td>
      </tr>
    `;
    }

    return stateEntries
      .map(
        (entry) => `
    <tr>
      <td>${new Date(entry.timestamp).toLocaleTimeString()}</td>
      <td>${entry.meta?.fromState || "initial"}</td>
      <td>${entry.meta?.toState || "unknown"}</td>
      <td><pre>${JSON.stringify(entry.data || {}, null, 2)}</pre></td>
    </tr>
  `
      )
      .join("");
  }

  private generateActionsTableHTML(): string {
    const actionEntries = this.logEntries.filter(
      (entry) => entry.meta?.type === "action"
    );

    if (actionEntries.length === 0) {
      return `
      <tr>
        <td colspan="4" style="text-align: center;">No actions recorded</td>
      </tr>
    `;
    }

    return actionEntries
      .map(
        (entry) => `
    <tr>
      <td>${new Date(entry.timestamp).toLocaleTimeString()}</td>
      <td>${entry.meta?.functionName || "unknown"}</td>
      <td><pre>${JSON.stringify(entry.data || {}, null, 2)}</pre></td>
      <td><pre>${
        entry.meta?.configValue
          ? JSON.stringify(entry.meta.configValue, null, 2).substring(0, 100) +
            (JSON.stringify(entry.meta.configValue, null, 2).length > 100
              ? "..."
              : "")
          : "N/A"
      }</pre></td>
    </tr>
  `
      )
      .join("");
  }

  private generateControllerCallsHTML(): string {
    const controllerEntries = this.logEntries.filter(
      (entry) => entry.meta?.type === "controller"
    );

    if (controllerEntries.length === 0) {
      return `
      <tr>
        <td colspan="6" style="text-align: center;">No controller calls recorded</td>
      </tr>
    `;
    }

    return controllerEntries
      .map((entry) => {
        const data = entry.data || {};
        const params = data.params
          ? JSON.stringify(data.params, null, 2)
          : "N/A";
        const result = data.result
          ? JSON.stringify(data.result, null, 2)
          : "N/A";

        return `
      <tr>
        <td>${new Date(entry.timestamp).toLocaleTimeString()}</td>
        <td>${entry.meta?.controllerName || "unknown"}</td>
        <td>${entry.meta?.methodName || "unknown"}</td>
        <td><pre>${
          params.length > 100 ? params.substring(0, 100) + "..." : params
        }</pre></td>
        <td><pre>${
          entry.meta?.configValue
            ? JSON.stringify(entry.meta.configValue, null, 2).substring(
                0,
                100
              ) +
              (JSON.stringify(entry.meta.configValue, null, 2).length > 100
                ? "..."
                : "")
            : "N/A"
        }</pre></td>
        <td><pre>${
          result.length > 100 ? result.substring(0, 100) + "..." : result
        }</pre></td>
      </tr>
    `;
      })
      .join("");
  }

  private generateErrorsTableHTML(): string {
    const errorEntries = this.summarizeErrors();

    if (errorEntries.length === 0) {
      return `
      <tr>
        <td colspan="3" style="text-align: center;">No errors recorded</td>
      </tr>
    `;
    }

    return errorEntries
      .map(
        (entry: any) => `
    <tr>
      <td>${new Date(entry.timestamp).toLocaleTimeString()}</td>
      <td>${entry.message}</td>
      <td><pre>${JSON.stringify(entry.data, null, 2)}</pre></td>
    </tr>
  `
      )
      .join("");
  }

  private generateProbabilityChecksHTML(): string {
    const probChecks = this.logEntries.filter(
      (entry) =>
        entry.meta?.type === "random_value" &&
        entry.meta?.category === "probability"
    );

    // Group by config name and property
    const grouped: any = {};

    probChecks.forEach((entry) => {
      const configName = entry.meta?.configName || "unknown";
      const property = entry.meta?.configValue?.section || "unknown";
      const key = `${configName}_${property}`;

      if (!grouped[key]) {
        grouped[key] = {
          configName,
          property,
          count: 0,
          success: 0,
          values: [],
          expectedValue: entry.meta?.probability,
        };
      }

      grouped[key].count++;
      if (entry.meta?.result === true) {
        grouped[key].success++;
      }

      if (typeof entry.meta?.actualValue === "number") {
        grouped[key].values.push(entry.meta.actualValue);
      }
    });

    // Calculate averages and success rates
    Object.keys(grouped).forEach((key) => {
      grouped[key].successRate = (
        (grouped[key].success / grouped[key].count) *
        100
      ).toFixed(2);

      if (grouped[key].values.length > 0) {
        const sum = grouped[key].values.reduce((a: any, b: any) => a + b, 0);
        grouped[key].average = (sum / grouped[key].values.length).toFixed(2);
      } else {
        grouped[key].average = "N/A";
      }
    });

    // Generate HTML rows
    if (Object.keys(grouped).length === 0) {
      return `
      <tr>
        <td colspan="6" style="text-align: center;">No probability checks recorded</td>
      </tr>
    `;
    }

    return Object.keys(grouped)
      .sort((a, b) => grouped[b].count - grouped[a].count)
      .map((key) => {
        const item = grouped[key];

        return `
        <tr>
          <td>${item.configName}</td>
          <td>${item.property}</td>
          <td>${
            item.expectedValue !== undefined ? `${item.expectedValue}%` : "N/A"
          }</td>
          <td>${item.successRate}%</td>
          <td>${item.count}</td>
          <td>${item.average !== "N/A" ? `${item.average}%` : "N/A"}</td>
        </tr>
      `;
      })
      .join("");
  }

  private generateTopActionsHTML(limit: number): string {
    const actions = this.summarizeActions();

    if (Object.keys(actions).length === 0) {
      return `
      <tr>
        <td colspan="2" style="text-align: center;">No actions recorded</td>
      </tr>
    `;
    }

    return Object.keys(actions)
      .sort((a, b) => actions[b].count - actions[a].count)
      .slice(0, limit)
      .map(
        (key) => `
      <tr>
        <td>${key}</td>
        <td>${actions[key].count}</td>
      </tr>
    `
      )
      .join("");
  }

  private generateTopControllersHTML(limit: number): string {
    const controllers = this.summarizeControllerCalls();

    if (Object.keys(controllers).length === 0) {
      return `
      <tr>
        <td colspan="3" style="text-align: center;">No controller calls recorded</td>
      </tr>
    `;
    }

    return Object.keys(controllers)
      .sort((a, b) => controllers[b].count - controllers[a].count)
      .slice(0, limit)
      .map((key) => {
        const methods = controllers[key].methods;
        const methodList = Object.keys(methods)
          .sort((a, b) => methods[b] - methods[a])
          .map((method) => `${method} (${methods[method]})`)
          .join(", ");

        return `
        <tr>
          <td>${key}</td>
          <td>${controllers[key].count}</td>
          <td>${methodList}</td>
        </tr>
      `;
      })
      .join("");
  }

  private generateStateTransitionText(): string {
    const transitions = this.getStateTransitions();

    if (transitions.length === 0) {
      return "No state transitions recorded";
    }

    return transitions
      .map(
        (entry) =>
          `${entry.meta?.fromState || "initial"} --> ${
            entry.meta?.toState || "unknown"
          }`
      )
      .join("\n");
  }
}

// Create and export a singleton instance
export const enhancedLogger = new EnhancedLogger();
export default enhancedLogger;
