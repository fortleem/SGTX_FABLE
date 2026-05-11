// SGTX Platform v6.2 — QC Portal & Inspection Management (Part 6.2.4)
// Full QC jobs, inspection logs, AI defect detection, sampling plans
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';
import type { Bindings } from '../lib/types';

const qc = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════
// QC JOB MANAGEMENT
// ═══════════════════════════════════════════════════════════

qc.get('/qc/jobs', async (c) => {
  const providerId = c.req.query('provider_id');
  const status = c.req.query('status');
  const exporterId = c.req.query('exporter_id');
  let sql = `SELECT qj.*, t1.legal_name as provider_name, t2.legal_name as exporter_name
    FROM qc_jobs qj
    LEFT JOIN tenants t1 ON qj.qc_provider_tenant_id = t1.id
    LEFT JOIN tenants t2 ON qj.exporter_tenant_id = t2.id`;
  const conds: string[] = [];
  if (providerId) conds.push(`qj.qc_provider_tenant_id = '${providerId}'`);
  if (status) conds.push(`qj.status = '${status}'`);
  if (exporterId) conds.push(`qj.exporter_tenant_id = '${exporterId}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY qj.assigned_at DESC LIMIT 50';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

qc.get('/qc/jobs/:id', async (c) => {
  const job = await c.env.DB.prepare(`
    SELECT qj.*, t1.legal_name as provider_name, t2.legal_name as exporter_name
    FROM qc_jobs qj
    LEFT JOIN tenants t1 ON qj.qc_provider_tenant_id = t1.id
    LEFT JOIN tenants t2 ON qj.exporter_tenant_id = t2.id
    WHERE qj.id = ?
  `).bind(c.req.param('id')).first();
  if (!job) return c.json({ error: 'QC job not found' }, 404);

  // Get inspection logs
  const { results: logs } = await c.env.DB.prepare(
    'SELECT * FROM inspection_logs WHERE qc_job_id = ? ORDER BY recorded_at ASC'
  ).bind(c.req.param('id')).all();

  return c.json({ data: { ...job, inspection_logs: logs } });
});

qc.post('/qc/jobs', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'qc.inspection.assign', actor_gtid: body.actor_gtid || 'system',
    action_context: {
      qc_provider_tenant_id: body.qc_provider_tenant_id,
      exporter_tenant_id: body.exporter_tenant_id,
      inspection_type: body.inspection_type,
    },
  });

  // AI-generated inspection points based on commodity
  const inspectionPoints = generateInspectionPoints(body.commodity_type || 'GENERAL');
  // AQL sampling plan
  const samplingPlan = generateSamplingPlan(body.lot_size || 1000, body.inspection_level || 'II');

  await c.env.DB.prepare(`
    INSERT INTO qc_jobs (id, shipment_ustn, trade_request_id, qc_provider_tenant_id, exporter_tenant_id, inspection_type, quality_specs, inspection_points, sampling_plan, status, governor_decision_id, assigned_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, ?)
  `).bind(
    id, body.shipment_ustn || null, body.trade_request_id || null,
    body.qc_provider_tenant_id, body.exporter_tenant_id,
    body.inspection_type || 'PRE_SHIPMENT',
    JSON.stringify(body.quality_specs || {}),
    JSON.stringify(inspectionPoints),
    JSON.stringify(samplingPlan),
    gov.decision_id, isoNow()
  ).run();

  return c.json({
    data: {
      id, inspection_points: inspectionPoints, sampling_plan: samplingPlan,
      governor_decision: gov,
    },
    message: 'QC job assigned'
  }, 201);
});

// Update QC job status
qc.patch('/qc/jobs/:id/status', async (c) => {
  const body = await c.req.json();
  const id = c.req.param('id');

  const sets = ['status = ?'];
  const vals: any[] = [body.status];

  if (body.verdict) { sets.push('verdict = ?'); vals.push(body.verdict); }
  if (body.report_data) { sets.push('report_data = ?'); vals.push(JSON.stringify(body.report_data)); }
  if (body.ai_defects) { sets.push('ai_defects = ?'); vals.push(JSON.stringify(body.ai_defects)); }
  if (body.status === 'COMPLETED') { sets.push('completed_at = ?'); vals.push(isoNow()); }

  vals.push(id);
  await c.env.DB.prepare(`UPDATE qc_jobs SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();

  return c.json({ message: `QC job status updated to ${body.status}` });
});

// ═══════════════════════════════════════════════════════════
// INSPECTION LOGS (Real-time inspection entries)
// ═══════════════════════════════════════════════════════════

qc.get('/qc/jobs/:id/logs', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM inspection_logs WHERE qc_job_id = ? ORDER BY recorded_at ASC'
  ).bind(c.req.param('id')).all();
  return c.json({ data: results });
});

qc.post('/qc/jobs/:id/logs', async (c) => {
  const body = await c.req.json();
  const logId = uuid();

  // AI analysis of the log entry
  const aiAnalysis = analyzeInspectionLog(body.log_type, body.data);

  await c.env.DB.prepare(`
    INSERT INTO inspection_logs (id, qc_job_id, inspector_employee_id, log_type, data, ai_analysis, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    logId, c.req.param('id'), body.inspector_employee_id || null,
    body.log_type, JSON.stringify(body.data || {}),
    JSON.stringify(aiAnalysis), isoNow()
  ).run();

  return c.json({ data: { id: logId, ai_analysis: aiAnalysis }, message: 'Inspection log recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// AI DEFECT DETECTION (Computer Vision simulation)
// ═══════════════════════════════════════════════════════════

qc.post('/qc/jobs/:id/ai-inspect', async (c) => {
  const body = await c.req.json();
  const jobId = c.req.param('id');

  // Simulate AI-based defect detection
  const defects = [];
  const numDefects = Math.floor(Math.random() * 4);
  const defectTypes = ['SURFACE_DAMAGE', 'COLOR_VARIATION', 'SIZE_DEVIATION', 'CONTAMINATION', 'MOISTURE_EXCESS', 'PEST_DETECTED', 'LABEL_ERROR'];

  for (let i = 0; i < numDefects; i++) {
    defects.push({
      id: uuid(),
      type: defectTypes[Math.floor(Math.random() * defectTypes.length)],
      severity: Math.random() > 0.7 ? 'CRITICAL' : Math.random() > 0.4 ? 'MAJOR' : 'MINOR',
      confidence: Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
      location: body.pallet_id || `PALLET-${Math.floor(Math.random() * 20) + 1}`,
      description: 'AI-detected anomaly in visual inspection',
      recommended_action: Math.random() > 0.5 ? 'REJECT_ITEM' : 'FLAG_FOR_REVIEW',
    });
  }

  const overallScore = defects.length === 0 ? 95 : Math.max(30, 95 - defects.length * 15 - defects.filter((d: any) => d.severity === 'CRITICAL').length * 20);
  const verdict = overallScore >= 80 ? 'PASS' : overallScore >= 50 ? 'CONDITIONAL' : 'FAIL';

  // Update job with AI defects
  await c.env.DB.prepare('UPDATE qc_jobs SET ai_defects = ? WHERE id = ?')
    .bind(JSON.stringify(defects), jobId).run();

  return c.json({
    data: {
      job_id: jobId,
      defects,
      overall_quality_score: overallScore,
      verdict,
      model: 'yolov8-defect-v3.2',
      processed_images: body.image_count || 24,
      inference_time_ms: Math.round(200 + Math.random() * 800),
    },
    message: `AI inspection complete: ${verdict} (${defects.length} defects found)`
  });
});

// ═══════════════════════════════════════════════════════════
// AI INSPECTION REPORT GENERATION
// ═══════════════════════════════════════════════════════════

qc.post('/qc/jobs/:id/report', async (c) => {
  const jobId = c.req.param('id');
  const job = await c.env.DB.prepare('SELECT * FROM qc_jobs WHERE id = ?').bind(jobId).first();
  if (!job) return c.json({ error: 'QC job not found' }, 404);

  const { results: logs } = await c.env.DB.prepare(
    'SELECT * FROM inspection_logs WHERE qc_job_id = ?'
  ).bind(jobId).all();

  const defects = JSON.parse((job.ai_defects as string) || '[]');
  const reportId = uuid();

  const report = {
    report_id: reportId,
    job_id: jobId,
    generated_at: isoNow(),
    inspection_type: job.inspection_type,
    summary: {
      total_items_inspected: logs.length || 10,
      defects_found: defects.length,
      critical_defects: defects.filter((d: any) => d.severity === 'CRITICAL').length,
      pass_rate: defects.length === 0 ? '100%' : `${Math.max(70, 100 - defects.length * 5)}%`,
    },
    verdict: job.verdict || (defects.length === 0 ? 'PASS' : defects.some((d: any) => d.severity === 'CRITICAL') ? 'FAIL' : 'CONDITIONAL'),
    ai_confidence: 0.91,
    recommendations: defects.length > 0
      ? ['Re-inspect flagged pallets', 'Photograph all defects', 'Notify exporter of findings']
      : ['Proceed to loading', 'No further inspection needed'],
    inspection_logs_count: logs.length,
    model_used: 'inspection-report-gen-v2.0',
  };

  // Update job with report
  await c.env.DB.prepare('UPDATE qc_jobs SET report_id = ?, report_data = ? WHERE id = ?')
    .bind(reportId, JSON.stringify(report), jobId).run();

  return c.json({ data: report, message: 'Inspection report generated' });
});

// ═══════════════════════════════════════════════════════════
// QC STATS
// ═══════════════════════════════════════════════════════════

qc.get('/qc/stats', async (c) => {
  const totalJobs = await c.env.DB.prepare('SELECT COUNT(*) as c FROM qc_jobs').first();
  const completedJobs = await c.env.DB.prepare("SELECT COUNT(*) as c FROM qc_jobs WHERE status = 'COMPLETED'").first();
  const passRate = await c.env.DB.prepare("SELECT COUNT(*) as c FROM qc_jobs WHERE verdict = 'PASS'").first();
  const failRate = await c.env.DB.prepare("SELECT COUNT(*) as c FROM qc_jobs WHERE verdict = 'FAIL'").first();
  const avgLogs = await c.env.DB.prepare('SELECT COUNT(*) as c FROM inspection_logs').first();

  return c.json({
    data: {
      total_jobs: (totalJobs as any)?.c || 0,
      completed_jobs: (completedJobs as any)?.c || 0,
      pass_rate: (totalJobs as any)?.c > 0
        ? (((passRate as any)?.c / (totalJobs as any)?.c) * 100).toFixed(1) + '%'
        : 'N/A',
      fail_rate: (totalJobs as any)?.c > 0
        ? (((failRate as any)?.c / (totalJobs as any)?.c) * 100).toFixed(1) + '%'
        : 'N/A',
      total_inspection_logs: (avgLogs as any)?.c || 0,
      ai_models_active: 3,
    }
  });
});

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function generateInspectionPoints(commodityType: string): any[] {
  const basePoints = [
    { id: 1, category: 'VISUAL', description: 'Overall appearance and packaging integrity', priority: 'HIGH' },
    { id: 2, category: 'LABELING', description: 'Label accuracy, barcodes, lot numbers', priority: 'HIGH' },
    { id: 3, category: 'QUANTITY', description: 'Count verification against packing list', priority: 'HIGH' },
    { id: 4, category: 'DOCUMENTATION', description: 'Certificate of origin, phyto cert, quality cert', priority: 'MEDIUM' },
  ];

  if (commodityType === 'PERISHABLE' || commodityType === 'FOOD') {
    basePoints.push(
      { id: 5, category: 'TEMPERATURE', description: 'Core temperature measurement (< 4°C for fresh)', priority: 'CRITICAL' },
      { id: 6, category: 'FRESHNESS', description: 'Color, firmness, smell assessment', priority: 'HIGH' },
      { id: 7, category: 'PEST', description: 'Insect/pest inspection under UV', priority: 'HIGH' },
      { id: 8, category: 'MOISTURE', description: 'Moisture content measurement', priority: 'MEDIUM' },
    );
  } else if (commodityType === 'ELECTRONICS') {
    basePoints.push(
      { id: 5, category: 'FUNCTIONAL', description: 'Power-on test and basic function check', priority: 'CRITICAL' },
      { id: 6, category: 'SAFETY', description: 'Safety certification marks (CE, UL, FCC)', priority: 'HIGH' },
    );
  } else {
    basePoints.push(
      { id: 5, category: 'WEIGHT', description: 'Weight verification per pallet', priority: 'MEDIUM' },
      { id: 6, category: 'DIMENSIONS', description: 'Dimensional check against specs', priority: 'MEDIUM' },
    );
  }

  return basePoints;
}

function generateSamplingPlan(lotSize: number, level: string): any {
  // AQL-based sampling (ISO 2859-1 simplified)
  let sampleSize: number;
  if (lotSize <= 50) sampleSize = 8;
  else if (lotSize <= 150) sampleSize = 20;
  else if (lotSize <= 500) sampleSize = 50;
  else if (lotSize <= 1200) sampleSize = 80;
  else if (lotSize <= 3200) sampleSize = 125;
  else sampleSize = 200;

  if (level === 'I') sampleSize = Math.round(sampleSize * 0.6);
  else if (level === 'III') sampleSize = Math.round(sampleSize * 1.5);

  return {
    lot_size: lotSize,
    inspection_level: level,
    sample_size: sampleSize,
    aql: 2.5, // Acceptable Quality Level
    accept_number: Math.round(sampleSize * 0.025),
    reject_number: Math.round(sampleSize * 0.025) + 1,
    standard: 'ISO 2859-1',
    switching_rules: {
      to_tightened: 'If 2 of 5 consecutive lots rejected',
      to_reduced: 'If 10 consecutive lots accepted on first submission',
    },
  };
}

function analyzeInspectionLog(logType: string, data: any): any {
  const analysis: any = { analyzed_at: isoNow(), model: 'inspection-analyzer-v2.0' };

  switch (logType) {
    case 'SCAN':
      analysis.barcode_valid = true;
      analysis.matches_manifest = Math.random() > 0.05;
      analysis.confidence = 0.98;
      break;
    case 'DEFECT':
      analysis.severity_assessment = data.severity || 'MINOR';
      analysis.root_cause_prediction = 'Handling damage during transit';
      analysis.similar_defects_in_lot = Math.floor(Math.random() * 3);
      analysis.confidence = 0.85;
      break;
    case 'PHOTO':
      analysis.objects_detected = ['carton', 'pallet', 'label'];
      analysis.quality_score = Math.round(70 + Math.random() * 30);
      analysis.anomalies = Math.random() > 0.8 ? ['possible_water_damage'] : [];
      analysis.confidence = 0.89;
      break;
    case 'VOICE':
      analysis.transcription_confidence = 0.92;
      analysis.key_findings = ['Inspector noted good condition overall'];
      analysis.sentiment = 'POSITIVE';
      break;
    case 'SEAL_CHECK':
      analysis.seal_intact = Math.random() > 0.02;
      analysis.seal_number_matches = true;
      analysis.confidence = 0.99;
      break;
    default:
      analysis.processed = true;
      analysis.confidence = 0.80;
  }

  return analysis;
}

export default qc;
