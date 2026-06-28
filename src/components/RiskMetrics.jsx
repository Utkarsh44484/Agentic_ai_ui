import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../store/useStore';
import { ResponsiveBar } from '@nivo/bar';

export default function RiskMetrics() {
  const { selectedOrg } = useStore();
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRiskData() {
      if (!selectedOrg) return;
      setIsLoading(true);

      // 1. Fetch all risk columns for this specific organization
      const { data, error } = await supabase
        .from('agent_execution_steps')
        .select('input_risk, intent_risk, impact_risk')
        .eq('org_id', selectedOrg);

      if (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
        return;
      }

      // 2. Tally up the HIGH, MEDIUM, LOW risks
      const tallies = {
        Input:  { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        Intent: { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        Impact: { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 }
      };

      data.forEach(row => {
        if (tallies.Input[row.input_risk] !== undefined) tallies.Input[row.input_risk]++;
        if (tallies.Intent[row.intent_risk] !== undefined) tallies.Intent[row.intent_risk]++;
        if (tallies.Impact[row.impact_risk] !== undefined) tallies.Impact[row.impact_risk]++;
      });

      // 3. Format perfectly for Nivo Bar Chart
      const formattedData = [
        { category: "Input Risk",  HIGH: tallies.Input.HIGH,  MEDIUM: tallies.Input.MEDIUM,  LOW: tallies.Input.LOW },
        { category: "Intent Risk", HIGH: tallies.Intent.HIGH, MEDIUM: tallies.Intent.MEDIUM, LOW: tallies.Intent.LOW },
        { category: "Impact Risk", HIGH: tallies.Impact.HIGH, MEDIUM: tallies.Impact.MEDIUM, LOW: tallies.Impact.LOW }
      ];

      setChartData(formattedData);
      setIsLoading(false);
    }

    fetchRiskData();
  }, [selectedOrg]); // Re-run this anytime the selected organization changes!

  // Define exact traffic-light colors for our risks
  const riskColors = {
    HIGH: '#ef4444',   // Red
    MEDIUM: '#f59e0b', // Yellow
    LOW: '#10b981'     // Green
  };

  if (isLoading) return <div style={{ padding: '20px', color: '#6b7280' }}>Loading live risk data...</div>;

  return (
    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <h2 style={{ margin: '0 0 5px 0', fontSize: '1.25rem', color: '#111827' }}>Global Risk Summary</h2>
      <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '0.9rem' }}>
        Aggregated "Three I's" assessment for <strong>{selectedOrg}</strong>
      </p>

      {/* Nivo charts MUST have a parent div with a strict height! */}
      <div style={{ height: '400px', width: '100%' }}>
        <ResponsiveBar
          data={chartData}
          keys={['LOW', 'MEDIUM', 'HIGH']} // The order they stack
          indexBy="category"
          margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
          padding={0.3}
          layout="horizontal" // Horizontal bars look best for this
          colors={({ id }) => riskColors[id]} // Apply our traffic light colors
          borderColor={{ from: 'color', modifiers: [ [ 'darker', 1.6 ] ] }}
          axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: 'Total Steps', legendPosition: 'middle', legendOffset: 40 }}
          axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0 }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor="#ffffff"
          legends={[
            {
              dataFrom: 'keys',
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 120,
              translateY: 0,
              itemsSpacing: 2,
              itemWidth: 100,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              symbolSize: 20,
            }
          ]}
        />
      </div>
    </div>
  );
}