// src/ai/embeddings/response-quality-metrics.ts

/**
 * @fileOverview Response quality metrics system for measuring and improving AI response quality
 */

import { ResponseQuality, QueryCacheEntry } from './contextual-learning';

export interface QualityMetricsConfig {
  enableRealTimeTracking: boolean;
  enableTrendAnalysis: boolean;
  enableAnomalyDetection: boolean;
  qualityThresholds: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
  metricWeights: {
    completeness: number;
    accuracy: number;
    relevance: number;
    clarity: number;
    timeliness: number;
  };
}

export interface QualityTrend {
  period: string;
  averageQuality: number;
  totalResponses: number;
  qualityDistribution: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
  topIssues: Array<{
    issue: string;
    frequency: number;
    impact: number;
  }>;
}

export interface QualityAnomaly {
  timestamp: number;
  type: 'quality_drop' | 'processing_spike' | 'accuracy_issue' | 'clarity_problem';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedQueries: number;
  suggestedActions: string[];
  metadata: {
    threshold: number;
    actualValue: number;
    expectedValue: number;
  };
}

export interface QualityReport {
  period: {
    start: number;
    end: number;
    duration: string;
  };
  overview: {
    totalResponses: number;
    averageQuality: number;
    qualityImprovement: number;
    topPerformingCategories: string[];
    underperformingCategories: string[];
  };
  metrics: {
    completeness: QualityMetricSummary;
    accuracy: QualityMetricSummary;
    relevance: QualityMetricSummary;
    clarity: QualityMetricSummary;
    timeliness: QualityMetricSummary;
  };
  trends: QualityTrend[];
  anomalies: QualityAnomaly[];
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    expectedImpact: string;
    implementationEffort: 'low' | 'medium' | 'high';
  }>;
}

export interface QualityMetricSummary {
  average: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
  trend: 'improving' | 'stable' | 'declining';
  trendStrength: number;
}

/**
 * Response quality metrics system for comprehensive quality tracking
 */
export class ResponseQualityMetrics {
  private config: QualityMetricsConfig;
  private qualityHistory: Array<ResponseQuality & { timestamp: number; category?: string }> = [];
  private anomalies: QualityAnomaly[] = [];
  private lastAnalysisTime = 0;

  constructor(config?: Partial<QualityMetricsConfig>) {
    this.config = {
      enableRealTimeTracking: true,
      enableTrendAnalysis: true,
      enableAnomalyDetection: true,
      qualityThresholds: {
        excellent: 0.85,
        good: 0.70,
        acceptable: 0.55,
        poor: 0.40,
      },
      metricWeights: {
        completeness: 0.25,
        accuracy: 0.25,
        relevance: 0.20,
        clarity: 0.15,
        timeliness: 0.15,
      },
      ...config,
    };
  }

  /**
   * Record a response quality measurement
   */
  recordQuality(quality: ResponseQuality, metadata?: { category?: string; queryId?: string }): void {
    if (!this.config.enableRealTimeTracking) return;

    const record = {
      ...quality,
      timestamp: Date.now(),
      category: metadata?.category,
    };

    this.qualityHistory.push(record);

    // Maintain history size (keep last 10,000 records)
    if (this.qualityHistory.length > 10000) {
      this.qualityHistory = this.qualityHistory.slice(-10000);
    }

    // Check for anomalies in real-time
    if (this.config.enableAnomalyDetection) {
      this.detectAnomalies(record);
    }

    console.log(`📊 Quality recorded: ${quality.overallScore.toFixed(3)} (${this.getQualityLabel(quality.overallScore)})`);
  }

  /**
   * Generate comprehensive quality report
   */
  generateQualityReport(options?: {
    startTime?: number;
    endTime?: number;
    category?: string;
    includeRecommendations?: boolean;
  }): QualityReport {
    const {
      startTime = Date.now() - (7 * 24 * 60 * 60 * 1000), // Last 7 days
      endTime = Date.now(),
      category,
      includeRecommendations = true,
    } = options || {};

    // Filter data by time range and category
    const filteredData = this.qualityHistory.filter(record => {
      const inTimeRange = record.timestamp >= startTime && record.timestamp <= endTime;
      const inCategory = !category || record.category === category;
      return inTimeRange && inCategory;
    });

    if (filteredData.length === 0) {
      return this.createEmptyReport(startTime, endTime);
    }

    // Calculate overview metrics
    const totalResponses = filteredData.length;
    const averageQuality = filteredData.reduce((sum, r) => sum + r.overallScore, 0) / totalResponses;
    
    // Calculate quality improvement (compare first and second half)
    const midPoint = Math.floor(filteredData.length / 2);
    const firstHalf = filteredData.slice(0, midPoint);
    const secondHalf = filteredData.slice(midPoint);
    const qualityImprovement = secondHalf.length > 0 && firstHalf.length > 0 ?
      (secondHalf.reduce((sum, r) => sum + r.overallScore, 0) / secondHalf.length) -
      (firstHalf.reduce((sum, r) => sum + r.overallScore, 0) / firstHalf.length) : 0;

    // Analyze categories
    const categoryPerformance = this.analyzeCategoryPerformance(filteredData);

    // Generate metric summaries
    const metrics = {
      completeness: this.generateMetricSummary(filteredData.map(r => r.completeness)),
      accuracy: this.generateMetricSummary(filteredData.map(r => r.accuracy)),
      relevance: this.generateMetricSummary(filteredData.map(r => r.relevance)),
      clarity: this.generateMetricSummary(filteredData.map(r => r.clarity)),
      timeliness: this.generateMetricSummary(filteredData.map(r => r.timeliness)),
    };

    // Generate trends
    const trends = this.config.enableTrendAnalysis ? 
      this.generateQualityTrends(filteredData, startTime, endTime) : [];

    // Get relevant anomalies
    const relevantAnomalies = this.anomalies.filter(a => 
      a.timestamp >= startTime && a.timestamp <= endTime
    );

    // Generate recommendations
    const recommendations = includeRecommendations ? 
      this.generateRecommendations(filteredData, metrics, relevantAnomalies) : [];

    return {
      period: {
        start: startTime,
        end: endTime,
        duration: this.formatDuration(endTime - startTime),
      },
      overview: {
        totalResponses,
        averageQuality,
        qualityImprovement,
        topPerformingCategories: categoryPerformance.top,
        underperformingCategories: categoryPerformance.bottom,
      },
      metrics,
      trends,
      anomalies: relevantAnomalies,
      recommendations,
    };
  }

  /**
   * Get real-time quality statistics
   */
  getRealTimeStats(): {
    current: {
      averageQuality: number;
      totalResponses: number;
      qualityDistribution: Record<string, number>;
    };
    recent: {
      last24h: number;
      last7d: number;
      trend: 'improving' | 'stable' | 'declining';
    };
    alerts: QualityAnomaly[];
  } {
    const now = Date.now();
    const last24h = this.qualityHistory.filter(r => r.timestamp > now - 24 * 60 * 60 * 1000);
    const last7d = this.qualityHistory.filter(r => r.timestamp > now - 7 * 24 * 60 * 60 * 1000);

    const currentAverage = this.qualityHistory.length > 0 ?
      this.qualityHistory.reduce((sum, r) => sum + r.overallScore, 0) / this.qualityHistory.length : 0;

    const qualityDistribution = this.calculateQualityDistribution(this.qualityHistory);

    const last24hAverage = last24h.length > 0 ?
      last24h.reduce((sum, r) => sum + r.overallScore, 0) / last24h.length : 0;

    const last7dAverage = last7d.length > 0 ?
      last7d.reduce((sum, r) => sum + r.overallScore, 0) / last7d.length : 0;

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (last24hAverage > currentAverage + 0.05) {
      trend = 'improving';
    } else if (last24hAverage < currentAverage - 0.05) {
      trend = 'declining';
    }

    // Get recent critical alerts
    const recentAlerts = this.anomalies
      .filter(a => a.timestamp > now - 60 * 60 * 1000 && a.severity === 'critical')
      .slice(-5);

    return {
      current: {
        averageQuality: currentAverage,
        totalResponses: this.qualityHistory.length,
        qualityDistribution,
      },
      recent: {
        last24h: last24hAverage,
        last7d: last7dAverage,
        trend,
      },
      alerts: recentAlerts,
    };
  }

  /**
   * Detect quality anomalies
   */
  private detectAnomalies(record: ResponseQuality & { timestamp: number; category?: string }): void {
    const recentRecords = this.qualityHistory.slice(-100); // Last 100 records for baseline
    if (recentRecords.length < 10) return; // Need sufficient data

    const baseline = {
      averageQuality: recentRecords.reduce((sum, r) => sum + r.overallScore, 0) / recentRecords.length,
      averageCompleteness: recentRecords.reduce((sum, r) => sum + r.completeness, 0) / recentRecords.length,
      averageAccuracy: recentRecords.reduce((sum, r) => sum + r.accuracy, 0) / recentRecords.length,
      averageClarity: recentRecords.reduce((sum, r) => sum + r.clarity, 0) / recentRecords.length,
    };

    const anomalies: QualityAnomaly[] = [];

    // Detect quality drop
    if (record.overallScore < baseline.averageQuality - 0.3) {
      anomalies.push({
        timestamp: record.timestamp,
        type: 'quality_drop',
        severity: record.overallScore < baseline.averageQuality - 0.5 ? 'critical' : 'high',
        description: `Quality dropped significantly: ${record.overallScore.toFixed(3)} vs baseline ${baseline.averageQuality.toFixed(3)}`,
        affectedQueries: 1,
        suggestedActions: [
          'Review query processing logic',
          'Check data source quality',
          'Verify model performance',
        ],
        metadata: {
          threshold: baseline.averageQuality - 0.3,
          actualValue: record.overallScore,
          expectedValue: baseline.averageQuality,
        },
      });
    }

    // Detect accuracy issues
    if (record.accuracy < baseline.averageAccuracy - 0.4) {
      anomalies.push({
        timestamp: record.timestamp,
        type: 'accuracy_issue',
        severity: 'high',
        description: `Accuracy significantly below baseline: ${record.accuracy.toFixed(3)} vs ${baseline.averageAccuracy.toFixed(3)}`,
        affectedQueries: 1,
        suggestedActions: [
          'Verify data source accuracy',
          'Review SQL query generation',
          'Check database connectivity',
        ],
        metadata: {
          threshold: baseline.averageAccuracy - 0.4,
          actualValue: record.accuracy,
          expectedValue: baseline.averageAccuracy,
        },
      });
    }

    // Detect clarity problems
    if (record.clarity < baseline.averageClarity - 0.3) {
      anomalies.push({
        timestamp: record.timestamp,
        type: 'clarity_problem',
        severity: 'medium',
        description: `Response clarity below acceptable level: ${record.clarity.toFixed(3)}`,
        affectedQueries: 1,
        suggestedActions: [
          'Review response formatting',
          'Improve language model prompts',
          'Add response structure validation',
        ],
        metadata: {
          threshold: baseline.averageClarity - 0.3,
          actualValue: record.clarity,
          expectedValue: baseline.averageClarity,
        },
      });
    }

    // Add detected anomalies
    this.anomalies.push(...anomalies);

    // Maintain anomaly history (keep last 1000)
    if (this.anomalies.length > 1000) {
      this.anomalies = this.anomalies.slice(-1000);
    }

    if (anomalies.length > 0) {
      console.warn(`⚠️ Detected ${anomalies.length} quality anomalies`);
    }
  }

  private getQualityLabel(score: number): string {
    if (score >= this.config.qualityThresholds.excellent) return 'Excellent';
    if (score >= this.config.qualityThresholds.good) return 'Good';
    if (score >= this.config.qualityThresholds.acceptable) return 'Acceptable';
    return 'Poor';
  }

  private analyzeCategoryPerformance(data: Array<ResponseQuality & { category?: string }>): {
    top: string[];
    bottom: string[];
  } {
    const categoryStats = new Map<string, { total: number; count: number }>();

    for (const record of data) {
      const category = record.category || 'uncategorized';
      if (!categoryStats.has(category)) {
        categoryStats.set(category, { total: 0, count: 0 });
      }
      const stats = categoryStats.get(category)!;
      stats.total += record.overallScore;
      stats.count++;
    }

    const categoryAverages = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        average: stats.total / stats.count,
        count: stats.count,
      }))
      .filter(item => item.count >= 3) // Only categories with sufficient data
      .sort((a, b) => b.average - a.average);

    return {
      top: categoryAverages.slice(0, 3).map(item => item.category),
      bottom: categoryAverages.slice(-3).map(item => item.category),
    };
  }

  private generateMetricSummary(values: number[]): QualityMetricSummary {
    if (values.length === 0) {
      return {
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
        trend: 'stable',
        trendStrength: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Calculate standard deviation
    const variance = values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate trend (compare first and second half)
    const midPoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midPoint);
    const secondHalf = values.slice(midPoint);

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    let trendStrength = 0;

    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
      const difference = secondAvg - firstAvg;
      
      trendStrength = Math.abs(difference);
      
      if (difference > 0.05) {
        trend = 'improving';
      } else if (difference < -0.05) {
        trend = 'declining';
      }
    }

    return {
      average,
      median,
      min,
      max,
      standardDeviation,
      trend,
      trendStrength,
    };
  }

  private generateQualityTrends(
    data: Array<ResponseQuality & { timestamp: number; category?: string }>,
    startTime: number,
    endTime: number
  ): QualityTrend[] {
    const duration = endTime - startTime;
    const bucketSize = Math.max(60 * 60 * 1000, duration / 24); // At least 1 hour, max 24 buckets
    const buckets = new Map<number, Array<ResponseQuality & { timestamp: number; category?: string }>>();

    // Group data into time buckets
    for (const record of data) {
      const bucketKey = Math.floor((record.timestamp - startTime) / bucketSize);
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(record);
    }

    // Generate trends for each bucket
    const trends: QualityTrend[] = [];
    for (const [bucketKey, bucketData] of buckets) {
      if (bucketData.length === 0) continue;

      const bucketStart = startTime + bucketKey * bucketSize;
      const averageQuality = bucketData.reduce((sum, r) => sum + r.overallScore, 0) / bucketData.length;
      
      const qualityDistribution = this.calculateQualityDistribution(bucketData);
      
      // Identify top issues in this period
      const issues = this.identifyQualityIssues(bucketData);

      trends.push({
        period: new Date(bucketStart).toISOString(),
        averageQuality,
        totalResponses: bucketData.length,
        qualityDistribution,
        topIssues: issues,
      });
    }

    return trends.sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());
  }

  private calculateQualityDistribution(data: Array<ResponseQuality & { timestamp: number }>): {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  } {
    const distribution = { excellent: 0, good: 0, acceptable: 0, poor: 0 };
    
    for (const record of data) {
      const score = record.overallScore;
      if (score >= this.config.qualityThresholds.excellent) {
        distribution.excellent++;
      } else if (score >= this.config.qualityThresholds.good) {
        distribution.good++;
      } else if (score >= this.config.qualityThresholds.acceptable) {
        distribution.acceptable++;
      } else {
        distribution.poor++;
      }
    }

    return distribution;
  }

  private identifyQualityIssues(data: Array<ResponseQuality & { timestamp: number }>): Array<{
    issue: string;
    frequency: number;
    impact: number;
  }> {
    const issues: Array<{ issue: string; frequency: number; impact: number }> = [];
    
    // Analyze common quality issues
    const lowCompleteness = data.filter(r => r.completeness < 0.6).length;
    const lowAccuracy = data.filter(r => r.accuracy < 0.6).length;
    const lowClarity = data.filter(r => r.clarity < 0.6).length;
    const slowResponses = data.filter(r => r.timeliness < 0.6).length;

    if (lowCompleteness > 0) {
      issues.push({
        issue: 'Incomplete responses',
        frequency: lowCompleteness / data.length,
        impact: lowCompleteness * 0.25, // Weight by completeness importance
      });
    }

    if (lowAccuracy > 0) {
      issues.push({
        issue: 'Accuracy problems',
        frequency: lowAccuracy / data.length,
        impact: lowAccuracy * 0.25, // Weight by accuracy importance
      });
    }

    if (lowClarity > 0) {
      issues.push({
        issue: 'Clarity issues',
        frequency: lowClarity / data.length,
        impact: lowClarity * 0.15, // Weight by clarity importance
      });
    }

    if (slowResponses > 0) {
      issues.push({
        issue: 'Slow processing',
        frequency: slowResponses / data.length,
        impact: slowResponses * 0.15, // Weight by timeliness importance
      });
    }

    return issues.sort((a, b) => b.impact - a.impact).slice(0, 3);
  }

  private generateRecommendations(
    data: Array<ResponseQuality & { timestamp: number; category?: string }>,
    metrics: Record<string, QualityMetricSummary>,
    anomalies: QualityAnomaly[]
  ): Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    expectedImpact: string;
    implementationEffort: 'low' | 'medium' | 'high';
  }> {
    const recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      category: string;
      description: string;
      expectedImpact: string;
      implementationEffort: 'low' | 'medium' | 'high';
    }> = [];

    // Analyze metrics for recommendations
    if (metrics.completeness.average < 0.7) {
      recommendations.push({
        priority: 'high',
        category: 'Completeness',
        description: 'Improve response completeness by enhancing context utilization and memory integration',
        expectedImpact: 'Increase completeness by 15-25%',
        implementationEffort: 'medium',
      });
    }

    if (metrics.accuracy.average < 0.7) {
      recommendations.push({
        priority: 'high',
        category: 'Accuracy',
        description: 'Enhance data validation and SQL query optimization to improve accuracy',
        expectedImpact: 'Increase accuracy by 10-20%',
        implementationEffort: 'high',
      });
    }

    if (metrics.clarity.average < 0.7) {
      recommendations.push({
        priority: 'medium',
        category: 'Clarity',
        description: 'Implement response formatting improvements and clarity validation',
        expectedImpact: 'Improve clarity by 20-30%',
        implementationEffort: 'low',
      });
    }

    if (metrics.timeliness.average < 0.7) {
      recommendations.push({
        priority: 'medium',
        category: 'Performance',
        description: 'Optimize query processing and implement better caching strategies',
        expectedImpact: 'Reduce processing time by 30-50%',
        implementationEffort: 'medium',
      });
    }

    // Add recommendations based on anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Stability',
        description: 'Address critical quality anomalies to prevent system degradation',
        expectedImpact: 'Prevent quality drops and improve system reliability',
        implementationEffort: 'high',
      });
    }

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  private createEmptyReport(startTime: number, endTime: number): QualityReport {
    return {
      period: {
        start: startTime,
        end: endTime,
        duration: this.formatDuration(endTime - startTime),
      },
      overview: {
        totalResponses: 0,
        averageQuality: 0,
        qualityImprovement: 0,
        topPerformingCategories: [],
        underperformingCategories: [],
      },
      metrics: {
        completeness: this.generateMetricSummary([]),
        accuracy: this.generateMetricSummary([]),
        relevance: this.generateMetricSummary([]),
        clarity: this.generateMetricSummary([]),
        timeliness: this.generateMetricSummary([]),
      },
      trends: [],
      anomalies: [],
      recommendations: [],
    };
  }

  private formatDuration(milliseconds: number): string {
    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
    const hours = Math.floor((milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) {
      return `${days} days, ${hours} hours`;
    } else if (hours > 0) {
      return `${hours} hours`;
    } else {
      const minutes = Math.floor(milliseconds / (60 * 1000));
      return `${minutes} minutes`;
    }
  }

  /**
   * Clear all quality data (for testing or reset)
   */
  clearData(): void {
    this.qualityHistory = [];
    this.anomalies = [];
    this.lastAnalysisTime = 0;
    console.log('🧹 Quality metrics data cleared');
  }

  /**
   * Export quality data for analysis
   */
  exportData(): {
    qualityHistory: Array<ResponseQuality & { timestamp: number; category?: string }>;
    anomalies: QualityAnomaly[];
    config: QualityMetricsConfig;
  } {
    return {
      qualityHistory: [...this.qualityHistory],
      anomalies: [...this.anomalies],
      config: { ...this.config },
    };
  }
}

// Global instance
let globalQualityMetrics: ResponseQualityMetrics | null = null;

/**
 * Get or create global response quality metrics system
 */
export function getResponseQualityMetrics(
  config?: Partial<QualityMetricsConfig>
): ResponseQualityMetrics {
  if (!globalQualityMetrics) {
    globalQualityMetrics = new ResponseQualityMetrics(config);
  }
  return globalQualityMetrics;
}