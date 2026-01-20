import { useState, useEffect } from 'react';
import { getStats } from '../api/gpbcApi.js';

function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStats();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#dc3545' }}>
        <p>Error loading statistics: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Dashboard Statistics</h2>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={statCardStyle}>
          <h3 style={statTitleStyle}>Total Contacts</h3>
          <p style={statValueStyle}>{stats?.totalContacts || 0}</p>
        </div>
        
        <div style={statCardStyle}>
          <h3 style={statTitleStyle}>Opt-In Yes</h3>
          <p style={statValueStyle}>{stats?.optInCount || stats?.optInYes || 0}</p>
        </div>
        
        <div style={statCardStyle}>
          <h3 style={statTitleStyle}>Opt-In No</h3>
          <p style={statValueStyle}>{stats?.optOutCount || stats?.optInNo || 0}</p>
        </div>
      </div>

      <h3 style={{ marginTop: '30px', marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>Groups</h3>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{...statCardStyle, backgroundColor: '#e3f2fd'}}>
          <h3 style={statTitleStyle}>👨 Men</h3>
          <p style={statValueStyle}>{stats?.menCount || 0}</p>
        </div>
        
        <div style={{...statCardStyle, backgroundColor: '#fce4ec'}}>
          <h3 style={statTitleStyle}>👩 Women</h3>
          <p style={statValueStyle}>{stats?.womenCount || 0}</p>
        </div>
        
        <div style={{...statCardStyle, backgroundColor: '#fff3e0'}}>
          <h3 style={statTitleStyle}>🎓 Young Adults</h3>
          <p style={statValueStyle}>{stats?.youngAdultCount || 0}</p>
        </div>
      </div>
    </div>
  );
}

const statCardStyle = {
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '20px',
  minWidth: '200px',
  flex: '1',
  backgroundColor: '#f8f9fa',
};

const statTitleStyle = {
  margin: '0 0 10px 0',
  fontSize: '16px',
  fontWeight: 'normal',
  color: '#6c757d',
};

const statValueStyle = {
  margin: 0,
  fontSize: '36px',
  fontWeight: 'bold',
  color: '#212529',
};

export default DashboardStats;
