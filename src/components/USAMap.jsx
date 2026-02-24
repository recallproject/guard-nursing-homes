import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';

const FIPS_TO_STATE = {
  '01': 'AL',
  '02': 'AK',
  '04': 'AZ',
  '05': 'AR',
  '06': 'CA',
  '08': 'CO',
  '09': 'CT',
  '10': 'DE',
  '11': 'DC',
  '12': 'FL',
  '13': 'GA',
  '15': 'HI',
  '16': 'ID',
  '17': 'IL',
  '18': 'IN',
  '19': 'IA',
  '20': 'KS',
  '21': 'KY',
  '22': 'LA',
  '23': 'ME',
  '24': 'MD',
  '25': 'MA',
  '26': 'MI',
  '27': 'MN',
  '28': 'MS',
  '29': 'MO',
  '30': 'MT',
  '31': 'NE',
  '32': 'NV',
  '33': 'NH',
  '34': 'NJ',
  '35': 'NM',
  '36': 'NY',
  '37': 'NC',
  '38': 'ND',
  '39': 'OH',
  '40': 'OK',
  '41': 'OR',
  '42': 'PA',
  '44': 'RI',
  '45': 'SC',
  '46': 'SD',
  '47': 'TN',
  '48': 'TX',
  '49': 'UT',
  '50': 'VT',
  '51': 'VA',
  '53': 'WA',
  '54': 'WV',
  '55': 'WI',
  '56': 'WY',
  '72': 'PR',
  '66': 'GU',
};

export default function USAMap({ data, onStateSelect }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const [tooltip, setTooltip] = useState({
    visible: false,
    content: null,
    x: 0,
    y: 0,
  });

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [topoData, setTopoData] = useState(null);

  // Load TopoJSON
  useEffect(() => {
    async function loadTopoJSON() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}states-10m.json`);
        const topo = await response.json();
        setTopoData(topo);
      } catch (err) {
        console.error('Error loading TopoJSON:', err);
      }
    }
    loadTopoJSON();
  }, []);

  // Handle resize
  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    }

    handleResize();
    const debouncedResize = debounce(handleResize, 150);
    window.addEventListener('resize', debouncedResize);

    return () => window.removeEventListener('resize', debouncedResize);
  }, []);

  // Main D3 rendering
  useEffect(() => {
    if (!svgRef.current || !topoData || !data) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create projection
    const projection = d3
      .geoAlbersUsa()
      .translate([width / 2, height / 2])
      .scale(width * 1.2);

    const path = d3.geoPath().projection(projection);

    // Convert TopoJSON to GeoJSON
    const states = feature(topoData, topoData.objects.states);

    // Main group
    const g = svg.append('g');

    // Get VIVID, SATURATED color for state based on avg composite score
    function getStateColor(stateCode) {
      const stateSummary = data.state_summary?.[stateCode];
      if (!stateSummary) return '#0D9488'; // teal (low risk)

      const avgScore = stateSummary.avg_composite || 0;

      // FULL OPACITY, BOLD COLORS
      if (avgScore >= 50) return '#DC2626'; // red (critical)
      if (avgScore >= 40) return '#EA580C'; // orange (high)
      if (avgScore >= 30) return '#D97706'; // amber (elevated)
      return '#0D9488'; // teal (low)
    }

    // Draw states with BOLD colors
    g.selectAll('path')
      .data(states.features)
      .join('path')
      .attr('class', 'state-path')
      .attr('d', path)
      .attr('fill', (d) => {
        const fips = d.id;
        const stateCode = FIPS_TO_STATE[fips];
        return getStateColor(stateCode);
      })
      .attr('stroke', '#FFFFFF') // White borders
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s ease')
      .on('mouseenter', function (event, d) {
        const fips = d.id;
        const stateCode = FIPS_TO_STATE[fips];
        const stateSummary = data.state_summary?.[stateCode];

        if (stateSummary) {
          // LIFT effect
          d3.select(this)
            .attr('stroke-width', 3)
            .style('filter', 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5))')
            .style('transform', 'scale(1.03)')
            .style('transform-origin', 'center');

          setTooltip({
            visible: true,
            content: {
              name: d.properties.name,
              facilities: stateSummary.count,
              highRisk: stateSummary.high_risk,
              avgScore: stateSummary.avg_composite?.toFixed(1),
            },
            x: event.clientX,
            y: event.clientY,
          });
        }
      })
      .on('mousemove', (event) => {
        setTooltip((prev) => ({
          ...prev,
          x: event.clientX,
          y: event.clientY,
        }));
      })
      .on('mouseleave', function () {
        d3.select(this)
          .attr('stroke-width', 2)
          .style('filter', 'none')
          .style('transform', 'scale(1)');

        setTooltip({ visible: false, content: null, x: 0, y: 0 });
      })
      .on('click', (event, d) => {
        const fips = d.id;
        const stateCode = FIPS_TO_STATE[fips];
        if (data.states[stateCode]) {
          onStateSelect(stateCode);
        }
      });
  }, [topoData, data, dimensions, onStateSelect]);

  return (
    <div className="usa-map-container" ref={containerRef}>
      <svg
        ref={svgRef}
        className="usa-map-svg"
        width={dimensions.width}
        height={dimensions.height}
      />

      {tooltip.visible && tooltip.content && (
        <div
          className="map-tooltip visible"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y + 12,
          }}
        >
          <div className="tooltip-title">{tooltip.content.name}</div>
          <div className="tooltip-content">
            <div className="tooltip-row">
              <span className="tooltip-label">Facilities:</span>
              <span className="tooltip-value">{tooltip.content.facilities}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">High Risk:</span>
              <span className="tooltip-value tooltip-value-danger">
                {tooltip.content.highRisk}
              </span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Avg Score:</span>
              <span className="tooltip-value">{tooltip.content.avgScore}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
