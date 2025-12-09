-- ============================================================================
-- SHAP Report Database Queries
-- ============================================================================

-- Query 1: Get all ML SHAP reports from incidents table
-- ============================================================================
SELECT 
    id,
    title,
    description,
    incident_type,
    severity,
    created_at,
    metadata->>'location_id' as location_id,
    metadata->>'risk_score' as risk_score,
    metadata->>'model_name' as model_name,
    metadata->'shap_top' as shap_values
FROM incidents
WHERE incident_type = 'ml_shap_report'
ORDER BY created_at DESC;

-- Query 2: Get SHAP reports with formatted SHAP values
-- ============================================================================
SELECT 
    id,
    title,
    severity,
    created_at,
    metadata->>'location_id' as location,
    CAST(metadata->>'risk_score' as DECIMAL(5,3)) as risk_score,
    metadata->>'model_name' as model,
    jsonb_array_length(metadata->'shap_top') as num_shap_features,
    metadata->'shap_top' as shap_contributions
FROM incidents
WHERE incident_type = 'ml_shap_report'
ORDER BY created_at DESC
LIMIT 10;

-- Query 3: Get top SHAP features across all reports
-- ============================================================================
WITH shap_features AS (
    SELECT 
        id,
        metadata->>'location_id' as location,
        jsonb_array_elements(metadata->'shap_top') as feature_pair
    FROM incidents
    WHERE incident_type = 'ml_shap_report'
        AND metadata->'shap_top' IS NOT NULL
)
SELECT 
    feature_pair->>0 as feature_name,
    COUNT(*) as appearance_count,
    AVG(CAST(feature_pair->>1 as FLOAT)) as avg_contribution,
    MAX(CAST(feature_pair->>1 as FLOAT)) as max_contribution,
    MIN(CAST(feature_pair->>1 as FLOAT)) as min_contribution
FROM shap_features
GROUP BY feature_pair->>0
ORDER BY appearance_count DESC, ABS(avg_contribution) DESC
LIMIT 20;

-- Query 4: Get SHAP reports for a specific location
-- ============================================================================
SELECT 
    id,
    title,
    severity,
    created_at,
    CAST(metadata->>'risk_score' as DECIMAL(5,3)) as risk_score,
    metadata->>'klass' as risk_class,
    metadata->>'recommended_action' as action,
    metadata->'shap_top' as top_features
FROM incidents
WHERE incident_type = 'ml_shap_report'
    AND metadata->>'location_id' = 'JH-UG-01'  -- Change location as needed
ORDER BY created_at DESC;

-- Query 5: Get SHAP reports with ensemble details
-- ============================================================================
SELECT 
    id,
    title,
    created_at,
    metadata->>'location_id' as location,
    CAST(metadata->>'risk_score' as DECIMAL(5,3)) as risk_score,
    metadata->'ensemble_details'->>'xgb_score' as xgb_score,
    metadata->'ensemble_details'->>'lstm_score' as lstm_score,
    metadata->'ensemble_details'->>'xgb_weight' as xgb_weight,
    metadata->'ensemble_details'->>'lstm_weight' as lstm_weight,
    metadata->'shap_top' as shap_values
FROM incidents
WHERE incident_type = 'ml_shap_report'
    AND metadata->'ensemble_details' IS NOT NULL
ORDER BY created_at DESC;

-- Query 6: Get critical SHAP reports (high risk)
-- ============================================================================
SELECT 
    id,
    title,
    severity,
    created_at,
    metadata->>'location_id' as location,
    CAST(metadata->>'risk_score' as DECIMAL(5,3)) as risk_score,
    metadata->'shap_top' as top_contributors
FROM incidents
WHERE incident_type = 'ml_shap_report'
    AND severity = 'critical'
    AND CAST(metadata->>'risk_score' as FLOAT) >= 0.6
ORDER BY CAST(metadata->>'risk_score' as FLOAT) DESC;

-- Query 7: Expand SHAP features into rows for analysis
-- ============================================================================
WITH shap_expanded AS (
    SELECT 
        i.id,
        i.created_at,
        i.metadata->>'location_id' as location,
        CAST(i.metadata->>'risk_score' as DECIMAL(5,3)) as risk_score,
        elem.ordinality as rank,
        elem.value->>0 as feature_name,
        CAST(elem.value->>1 as FLOAT) as contribution
    FROM incidents i
    CROSS JOIN LATERAL jsonb_array_elements(i.metadata->'shap_top') 
        WITH ORDINALITY as elem
    WHERE i.incident_type = 'ml_shap_report'
)
SELECT 
    id,
    location,
    risk_score,
    rank,
    feature_name,
    ROUND(contribution::numeric, 4) as contribution,
    CASE 
        WHEN contribution > 0 THEN 'Risk Increasing'
        ELSE 'Risk Decreasing'
    END as impact_type
FROM shap_expanded
WHERE id = (SELECT MAX(id) FROM incidents WHERE incident_type = 'ml_shap_report')
ORDER BY rank;

-- Query 8: Get SHAP reports with ML predictions
-- ============================================================================
SELECT 
    i.id as incident_id,
    i.created_at as report_created,
    i.severity,
    i.metadata->>'location_id' as location,
    CAST(i.metadata->>'risk_score' as DECIMAL(5,3)) as risk_score,
    i.metadata->'shap_top' as shap_features,
    p.id as prediction_id,
    p.model_name,
    p.confidence,
    p.ensemble_details
FROM incidents i
LEFT JOIN ml_predictions p 
    ON p.location_id = i.metadata->>'location_id'
    AND p.created_at >= i.created_at - INTERVAL '5 minutes'
    AND p.created_at <= i.created_at + INTERVAL '5 minutes'
WHERE i.incident_type = 'ml_shap_report'
ORDER BY i.created_at DESC
LIMIT 20;

-- Query 9: Get most recent SHAP report with full details
-- ============================================================================
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
    jsonb_pretty(metadata->'shap_top') as shap_features_formatted,
    jsonb_pretty(metadata->'ensemble_details') as ensemble_details_formatted
FROM incidents
WHERE incident_type = 'ml_shap_report'
ORDER BY created_at DESC
LIMIT 1;

-- Query 10: Count SHAP reports by severity and location
-- ============================================================================
SELECT 
    metadata->>'location_id' as location,
    severity,
    COUNT(*) as report_count,
    AVG(CAST(metadata->>'risk_score' as FLOAT)) as avg_risk_score,
    MAX(CAST(metadata->>'risk_score' as FLOAT)) as max_risk_score,
    MIN(created_at) as first_report,
    MAX(created_at) as latest_report
FROM incidents
WHERE incident_type = 'ml_shap_report'
GROUP BY metadata->>'location_id', severity
ORDER BY location, severity;

-- Query 11: Get SHAP reports from last 24 hours
-- ============================================================================
SELECT 
    id,
    title,
    severity,
    created_at,
    metadata->>'location_id' as location,
    CAST(metadata->>'risk_score' as DECIMAL(5,3)) as risk_score,
    metadata->'shap_top' as top_features
FROM incidents
WHERE incident_type = 'ml_shap_report'
    AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Query 12: Get feature importance summary across all SHAP reports
-- ============================================================================
WITH all_features AS (
    SELECT 
        jsonb_array_elements(metadata->'shap_top')->>0 as feature_name,
        CAST(jsonb_array_elements(metadata->'shap_top')->>1 as FLOAT) as contribution,
        metadata->>'location_id' as location,
        created_at
    FROM incidents
    WHERE incident_type = 'ml_shap_report'
        AND metadata->'shap_top' IS NOT NULL
)
SELECT 
    feature_name,
    COUNT(*) as times_in_top_features,
    ROUND(AVG(contribution)::numeric, 4) as avg_contribution,
    ROUND(STDDEV(contribution)::numeric, 4) as std_dev,
    ROUND(MAX(contribution)::numeric, 4) as max_contribution,
    ROUND(MIN(contribution)::numeric, 4) as min_contribution,
    COUNT(DISTINCT location) as locations_affected
FROM all_features
GROUP BY feature_name
ORDER BY times_in_top_features DESC, ABS(avg_contribution) DESC;

-- ============================================================================
-- Usage Examples:
-- ============================================================================
-- 
-- To run these queries in psql:
--   psql -U your_username -d your_database -f shap-report-queries.sql
--
-- To run a specific query:
--   psql -U your_username -d your_database -c "SELECT ... FROM incidents ..."
--
-- To export results to CSV:
--   psql -U your_username -d your_database -c "COPY (SELECT ...) TO '/path/to/output.csv' CSV HEADER"
--
-- ============================================================================
