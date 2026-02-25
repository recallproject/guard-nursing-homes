import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import gsap from 'gsap';
import '../styles/staffing-trend.css';

export function StaffingTrendChart({ facility, isPro = true }) {
  const chartRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!facility?.staffing_trend || !chartRef.current) return;

    const trend = facility.staffing_trend;
    if (!trend.quarters || trend.quarters.length === 0) return;

    // Clear previous chart
    d3.select(chartRef.current).selectAll('*').remove();

    // Dimensions
    const margin = { top: 20, right: 60, bottom: 40, left: 50 };
    const width = chartRef.current.offsetWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scalePoint()
      .domain(trend.quarters)
      .range([0, width])
      .padding(0.2);

    const yScaleLeft = d3.scaleLinear()
      .domain([0, Math.max(...trend.total_hprd, ...trend.rn_hprd, 4)])
      .range([height, 0]);

    const yScaleRight = d3.scaleLinear()
      .domain([0, Math.max(...trend.zero_rn_pct, 30)])
      .range([height, 0]);

    // Add AG recommended threshold line (3.48 HPRD)
    const thresholdY = yScaleLeft(3.48);
    svg.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', thresholdY)
      .attr('y2', thresholdY)
      .attr('stroke', '#94A3B8')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.6);

    svg.append('text')
      .attr('x', width - 5)
      .attr('y', thresholdY - 5)
      .attr('text-anchor', 'end')
      .attr('fill', '#94A3B8')
      .attr('font-size', '11px')
      .attr('font-family', 'Plus Jakarta Sans, sans-serif')
      .text('AG Recommended (3.48)');

    // Create line generators
    const lineTotal = d3.line()
      .x((d, i) => xScale(trend.quarters[i]))
      .y((d) => yScaleLeft(d))
      .curve(d3.curveMonotoneX);

    const lineRN = d3.line()
      .x((d, i) => xScale(trend.quarters[i]))
      .y((d) => yScaleLeft(d))
      .curve(d3.curveMonotoneX);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .attr('color', '#64748B')
      .selectAll('text')
      .style('font-family', 'Plus Jakarta Sans, sans-serif')
      .style('font-size', '12px');

    // Add Y axis (left - HPRD)
    svg.append('g')
      .call(d3.axisLeft(yScaleLeft).ticks(5))
      .attr('color', '#64748B')
      .selectAll('text')
      .style('font-family', 'Plus Jakarta Sans, sans-serif')
      .style('font-size', '11px');

    // Y axis label (left)
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94A3B8')
      .attr('font-size', '12px')
      .attr('font-family', 'Plus Jakarta Sans, sans-serif')
      .text('Hours per resident per day');

    // Add Y axis (right - Zero RN %)
    svg.append('g')
      .attr('transform', `translate(${width},0)`)
      .call(d3.axisRight(yScaleRight).ticks(5).tickFormat(d => d + '%'))
      .attr('color', '#64748B')
      .selectAll('text')
      .style('font-family', 'Plus Jakarta Sans, sans-serif')
      .style('font-size', '11px');

    // Y axis label (right)
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', width + 50)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94A3B8')
      .attr('font-size', '12px')
      .attr('font-family', 'Plus Jakarta Sans, sans-serif')
      .text('Zero RN %');

    // Add Total HPRD line
    const totalPath = svg.append('path')
      .datum(trend.total_hprd)
      .attr('fill', 'none')
      .attr('stroke', '#0D9488')
      .attr('stroke-width', 3)
      .attr('d', lineTotal)
      .attr('class', 'line-total');

    // Add RN HPRD line
    const rnPath = svg.append('path')
      .datum(trend.rn_hprd)
      .attr('fill', 'none')
      .attr('stroke', '#F59E0B')
      .attr('stroke-width', 3)
      .attr('d', lineRN)
      .attr('class', 'line-rn');

    // Add data points for Total HPRD
    const totalPoints = svg.selectAll('.dot-total')
      .data(trend.total_hprd)
      .enter()
      .append('circle')
      .attr('class', 'dot-total')
      .attr('cx', (d, i) => xScale(trend.quarters[i]))
      .attr('cy', (d) => yScaleLeft(d))
      .attr('r', 5)
      .attr('fill', '#0D9488')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        const idx = trend.total_hprd.indexOf(d);
        d3.select(this).attr('r', 7);
        showTooltip(event, {
          quarter: trend.quarters[idx],
          totalHPRD: trend.total_hprd[idx],
          rnHPRD: trend.rn_hprd[idx],
          zeroRN: trend.zero_rn_pct[idx],
          contractor: trend.contractor_pct[idx]
        });
      })
      .on('mouseleave', function() {
        d3.select(this).attr('r', 5);
        hideTooltip();
      });

    // Add data points for RN HPRD
    const rnPoints = svg.selectAll('.dot-rn')
      .data(trend.rn_hprd)
      .enter()
      .append('circle')
      .attr('class', 'dot-rn')
      .attr('cx', (d, i) => xScale(trend.quarters[i]))
      .attr('cy', (d) => yScaleLeft(d))
      .attr('r', 5)
      .attr('fill', '#F59E0B')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        const idx = trend.rn_hprd.indexOf(d);
        d3.select(this).attr('r', 7);
        showTooltip(event, {
          quarter: trend.quarters[idx],
          totalHPRD: trend.total_hprd[idx],
          rnHPRD: trend.rn_hprd[idx],
          zeroRN: trend.zero_rn_pct[idx],
          contractor: trend.contractor_pct[idx]
        });
      })
      .on('mouseleave', function() {
        d3.select(this).attr('r', 5);
        hideTooltip();
      });

    // Animate lines on mount (only once)
    if (!hasAnimated.current) {
      hasAnimated.current = true;

      const totalLength = totalPath.node().getTotalLength();
      const rnLength = rnPath.node().getTotalLength();

      totalPath
        .attr('stroke-dasharray', totalLength)
        .attr('stroke-dashoffset', totalLength);

      rnPath
        .attr('stroke-dasharray', rnLength)
        .attr('stroke-dashoffset', rnLength);

      gsap.to(totalPath.node(), {
        strokeDashoffset: 0,
        duration: 1.5,
        ease: 'power2.out'
      });

      gsap.to(rnPath.node(), {
        strokeDashoffset: 0,
        duration: 1.5,
        ease: 'power2.out',
        delay: 0.2
      });

      gsap.from(totalPoints.nodes(), {
        scale: 0,
        duration: 0.3,
        stagger: 0.1,
        delay: 1.2,
        ease: 'back.out(1.7)',
        transformOrigin: 'center'
      });

      gsap.from(rnPoints.nodes(), {
        scale: 0,
        duration: 0.3,
        stagger: 0.1,
        delay: 1.4,
        ease: 'back.out(1.7)',
        transformOrigin: 'center'
      });
    }
  }, [facility]);

  const showTooltip = (event, data) => {
    const tooltip = d3.select('.staffing-trend-tooltip');
    tooltip
      .style('opacity', 1)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .html(`
        <strong>${data.quarter}</strong><br/>
        Total HPRD: <span style="color: #0D9488">${data.totalHPRD.toFixed(2)}</span><br/>
        RN HPRD: <span style="color: #F59E0B">${data.rnHPRD.toFixed(2)}</span><br/>
        Zero RN Days: ${data.zeroRN.toFixed(1)}%<br/>
        ${data.contractor ? `Contractor: ${data.contractor.toFixed(1)}%` : ''}
      `);
  };

  const hideTooltip = () => {
    d3.select('.staffing-trend-tooltip').style('opacity', 0);
  };

  if (!facility?.staffing_trend) return null;

  const trend = facility.staffing_trend;

  // Direction badge
  const getDirectionBadge = () => {
    if (trend.direction === 'improving') {
      return <span className="trend-badge trend-badge--improving">Improving ↑</span>;
    } else if (trend.direction === 'declining') {
      return <span className="trend-badge trend-badge--declining">Declining ↓</span>;
    } else {
      return <span className="trend-badge trend-badge--stable">Stable →</span>;
    }
  };

  return (
    <div className="staffing-trend-chart">
      <div className="staffing-trend-header">
        <h3 className="staffing-trend-title">
          Staffing Trend {getDirectionBadge()}
        </h3>
        <p className="staffing-trend-subtitle">
          Hours of nursing care per resident per day, by quarter
        </p>
      </div>

      <div className="staffing-trend-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#0D9488' }}></span>
          <span className="legend-label">Total HPRD</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#F59E0B' }}></span>
          <span className="legend-label">RN HPRD</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-color--dashed" style={{ backgroundColor: '#94A3B8' }}></span>
          <span className="legend-label">AG Recommended</span>
        </div>
      </div>

      {!isPro ? (
        <div className="staffing-trend-gate">
          <div className="staffing-trend-blur" ref={chartRef}></div>
          <div className="staffing-trend-gate-overlay">
            <h4>Upgrade to Pro to see staffing trends</h4>
            <p>Track how staffing levels change over time</p>
            <button className="btn btn-primary">Upgrade to Pro</button>
          </div>
        </div>
      ) : (
        <div className="staffing-trend-chart-container" ref={chartRef}></div>
      )}

      <p className="staffing-trend-source">
        Source: CMS Payroll-Based Journal data
      </p>

      {/* Tooltip */}
      <div className="staffing-trend-tooltip"></div>
    </div>
  );
}
