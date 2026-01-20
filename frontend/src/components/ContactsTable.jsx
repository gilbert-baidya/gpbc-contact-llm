import { useState, useEffect } from 'react';
import { getContacts } from '../api/gpbcApi.js';

function ContactsTable() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getContacts();
        // Filter to only show contacts with Opt-In = 'Yes'
        const optedInContacts = data.filter(contact => contact.optIn === 'Yes');
        setContacts(optedInContacts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading contacts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#dc3545' }}>
        <p>Error loading contacts: {error}</p>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>No opted-in contacts found.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', overflowX: 'auto' }}>
      <h2 style={{ marginBottom: '20px' }}>Contacts (Opt-In: Yes)</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Phone</th>
            <th style={thStyle}>City</th>
            <th style={thStyle}>Opt-In</th>
            <th style={thStyle}>Language</th>
            <th style={thStyle}>Last Sent</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact, index) => (
            <tr key={contact.id || index} style={trStyle}>
              <td style={tdStyle}>{contact.name || '-'}</td>
              <td style={tdStyle}>{contact.phone || '-'}</td>
              <td style={tdStyle}>{contact.city || '-'}</td>
              <td style={tdStyle}>{contact.optIn || '-'}</td>
              <td style={tdStyle}>{contact.language || '-'}</td>
              <td style={tdStyle}>{contact.lastSent || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: '20px', color: '#6c757d' }}>
        Total: {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  border: '1px solid #ddd',
};

const thStyle = {
  backgroundColor: '#f8f9fa',
  padding: '12px',
  textAlign: 'left',
  borderBottom: '2px solid #ddd',
  fontWeight: 'bold',
  color: '#212529',
};

const tdStyle = {
  padding: '12px',
  borderBottom: '1px solid #ddd',
  color: '#495057',
};

const trStyle = {
  backgroundColor: '#fff',
};

export default ContactsTable;
