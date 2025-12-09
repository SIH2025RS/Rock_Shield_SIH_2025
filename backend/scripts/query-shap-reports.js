const pool = require('../src/db/pool');

/**
 * Query SHAP Reports from Database
 * Helper script to retrieve and display SHAP reports
 */

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Query 1: Get all SHAP reports
 */
async function getAllSHAPReports(limit = 10) {
    const query = `
    SELECT 
      id,
      title,
      severity,
      created_at,
      metadata->>'location_id' as location,
      CAST(metadata->>'risk_score' as DECIMAL(5,3)) as risk_score,
      metadata->>'model_name' as model,
      metadata->'shap_top' as shap_values
    FROM incidents
    WHERE incident_type = 'ml_shap_report'
    ORDER BY created_at DESC
    LIMIT $1
  `;

    const { rows } = await pool.query(query, [limit]);
    return rows;
}

/**
 * Query 2: Get SHAP report by ID
 */
async function getSHAPReportById(id) {
    const query = `
    SELECT 
      id,
      title,
      description,
      severity,
      created_at,
      metadata->>'location_id' as location,
      metadata->>'risk_score' as risk_score,
      metadata->>'klass' as risk_class,
      metadata->>'model_name' as model,
      metadata->>'confidence' as confidence,
      metadata->>'recommended_action' as action,
      metadata->'shap_top' as shap_features,
      metadata->'ensemble_details' as ensemble_details
    FROM incidents
    WHERE id = $1 AND incident_type = 'ml_shap_report'
  `;

    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
}

/**
 * Query 3: Get SHAP reports for a location
 */
async function getSHAPReportsByLocation(locationId, limit = 10) {
    const query = `
    SELECT 
      id,
      title,
      severity,
      created_at,
      CAST(metadata->>'risk_score' as DECIMAL(5,3)) as risk_score,
      metadata->>'klass' as risk_class,
      metadata->'shap_top' as shap_features
    FROM incidents
    WHERE incident_type = 'ml_shap_report'
      AND metadata->>'location_id' = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;

    const { rows } = await pool.query(query, [locationId, limit]);
    return rows;
}

/**
 * Query 4: Get top SHAP features across all reports
 */
async function getTopSHAPFeatures(limit = 20) {
    const query = `
    WITH shap_features AS (
      SELECT 
        jsonb_array_elements(metadata->'shap_top')->>0 as feature_name,
        CAST(jsonb_array_elements(metadata->'shap_top')->>1 as FLOAT) as contribution
      FROM incidents
      WHERE incident_type = 'ml_shap_report'
        AND metadata->'shap_top' IS NOT NULL
    )
    SELECT 
      feature_name,
      COUNT(*) as appearance_count,
      ROUND(AVG(contribution)::numeric, 4) as avg_contribution,
      ROUND(MAX(contribution)::numeric, 4) as max_contribution,
      ROUND(MIN(contribution)::numeric, 4) as min_contribution
    FROM shap_features
    GROUP BY feature_name
    ORDER BY appearance_count DESC, ABS(avg_contribution) DESC
    LIMIT $1
  `;

    const { rows } = await pool.query(query, [limit]);
    return rows;
}

/**
 * Display SHAP report
 */
function displaySHAPReport(report) {
    log('\n' + '='.repeat(70), 'bright');
    log(`SHAP Report #${report.id}`, 'bright');
    log('='.repeat(70), 'bright');

    log(`\nTitle:             ${report.title}`, 'cyan');
    log(`Location:          ${report.location}`, 'cyan');
    log(`Severity:          ${report.severity}`, report.severity === 'critical' ? 'red' : 'yellow');
    log(`Risk Score:        ${report.risk_score}`, 'cyan');
    log(`Risk Class:        ${report.risk_class}`, 'cyan');
    log(`Model:             ${report.model}`, 'cyan');
    log(`Confidence:        ${report.confidence}`, 'cyan');
    log(`Created:           ${new Date(report.created_at).toLocaleString()}`, 'cyan');

    if (report.action) {
        log(`\nRecommended Action:`, 'yellow');
        log(`  ${report.action}`, 'yellow');
    }

    // Display SHAP features
    if (report.shap_features) {
        const shapTop = typeof report.shap_features === 'string'
            ? JSON.parse(report.shap_features)
            : report.shap_features;

        if (Array.isArray(shapTop) && shapTop.length > 0) {
            log('\n' + '-'.repeat(70), 'blue');
            log('Top SHAP Features:', 'bright');
            log('-'.repeat(70), 'blue');

            shapTop.forEach(([feature, value], idx) => {
                const sign = value >= 0 ? '+' : '';
                const color = value >= 0 ? 'red' : 'green';
                log(`  ${idx + 1}. ${feature.padEnd(30)} ${sign}${value.toFixed(4)}`, color);
            });
        }
    }

    // Display ensemble details
    if (report.ensemble_details) {
        const ensemble = typeof report.ensemble_details === 'string'
            ? JSON.parse(report.ensemble_details)
            : report.ensemble_details;

        log('\n' + '-'.repeat(70), 'blue');
        log('Ensemble Details:', 'bright');
        log('-'.repeat(70), 'blue');
        log(`  XGB Score:         ${ensemble.xgb_score}`, 'cyan');
        log(`  LSTM Score:        ${ensemble.lstm_score}`, 'cyan');
        log(`  XGB Weight:        ${ensemble.xgb_weight}`, 'cyan');
        log(`  LSTM Weight:       ${ensemble.lstm_weight}`, 'cyan');
    }

    log('\n' + '='.repeat(70), 'bright');
}

/**
 * Display all reports summary
 */
function displayReportsSummary(reports) {
    log('\n' + '='.repeat(70), 'bright');
    log(`SHAP Reports Summary (${reports.length} reports)`, 'bright');
    log('='.repeat(70), 'bright');

    reports.forEach((report, idx) => {
        const riskColor = report.risk_score >= 0.6 ? 'red' : 'yellow';
        log(`\n${idx + 1}. Report #${report.id}`, 'cyan');
        log(`   Location:  ${report.location}`, 'cyan');
        log(`   Risk:      ${report.risk_score} (${report.severity})`, riskColor);
        log(`   Model:     ${report.model}`, 'cyan');
        log(`   Created:   ${new Date(report.created_at).toLocaleString()}`, 'cyan');
    });

    log('\n' + '='.repeat(70), 'bright');
}

/**
 * Display top features
 */
function displayTopFeatures(features) {
    log('\n' + '='.repeat(70), 'bright');
    log('Top SHAP Features Across All Reports', 'bright');
    log('='.repeat(70), 'bright');

    log('\nFeature Name                     Count    Avg Contrib    Max        Min', 'cyan');
    log('-'.repeat(70), 'blue');

    features.forEach((f, idx) => {
        const name = f.feature_name.padEnd(30);
        const count = String(f.appearance_count).padStart(5);
        const avg = String(f.avg_contribution).padStart(12);
        const max = String(f.max_contribution).padStart(10);
        const min = String(f.min_contribution).padStart(10);

        log(`${name} ${count}    ${avg}    ${max}    ${min}`);
    });

    log('\n' + '='.repeat(70), 'bright');
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        if (command === 'all' || !command) {
            // Get all reports
            const limit = parseInt(args[1]) || 10;
            log(`\nFetching ${limit} most recent SHAP reports...`, 'cyan');
            const reports = await getAllSHAPReports(limit);

            if (reports.length === 0) {
                log('\nNo SHAP reports found in database', 'yellow');
            } else {
                displayReportsSummary(reports);
            }

        } else if (command === 'get' || command === 'show') {
            // Get specific report by ID
            const id = parseInt(args[1]);
            if (!id) {
                log('\nError: Please provide report ID', 'red');
                log('Usage: node query-shap-reports.js get <id>', 'yellow');
                process.exit(1);
            }

            log(`\nFetching SHAP report #${id}...`, 'cyan');
            const report = await getSHAPReportById(id);

            if (!report) {
                log(`\nReport #${id} not found`, 'red');
            } else {
                displaySHAPReport(report);
            }

        } else if (command === 'location') {
            // Get reports for location
            const location = args[1];
            const limit = parseInt(args[2]) || 10;

            if (!location) {
                log('\nError: Please provide location ID', 'red');
                log('Usage: node query-shap-reports.js location <location_id> [limit]', 'yellow');
                process.exit(1);
            }

            log(`\nFetching SHAP reports for location ${location}...`, 'cyan');
            const reports = await getSHAPReportsByLocation(location, limit);

            if (reports.length === 0) {
                log(`\nNo reports found for location ${location}`, 'yellow');
            } else {
                displayReportsSummary(reports);
            }

        } else if (command === 'features') {
            // Get top features
            const limit = parseInt(args[1]) || 20;
            log(`\nAnalyzing top ${limit} SHAP features...`, 'cyan');
            const features = await getTopSHAPFeatures(limit);

            if (features.length === 0) {
                log('\nNo SHAP features found', 'yellow');
            } else {
                displayTopFeatures(features);
            }

        } else if (command === 'help' || command === '--help' || command === '-h') {
            console.log(`
SHAP Report Query Tool

Usage:
  node query-shap-reports.js [command] [options]

Commands:
  all [limit]              Get all SHAP reports (default: 10)
  get <id>                 Get specific report by ID
  show <id>                Alias for 'get'
  location <id> [limit]    Get reports for specific location
  features [limit]         Get top SHAP features across all reports
  help                     Show this help message

Examples:
  node query-shap-reports.js all 20
  node query-shap-reports.js get 5
  node query-shap-reports.js location JH-UG-01
  node query-shap-reports.js features 15
      `);

        } else {
            log(`\nUnknown command: ${command}`, 'red');
            log('Run with --help for usage information', 'yellow');
            process.exit(1);
        }

        process.exit(0);

    } catch (err) {
        log(`\nError: ${err.message}`, 'red');
        console.error(err);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    getAllSHAPReports,
    getSHAPReportById,
    getSHAPReportsByLocation,
    getTopSHAPFeatures
};
