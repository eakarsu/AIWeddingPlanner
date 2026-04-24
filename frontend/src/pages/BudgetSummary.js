import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function BudgetSummary() {
  const navigate = useNavigate();
  const [budgetData, setBudgetData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [budgetRes, statsRes] = await Promise.all([
          API.get('/dashboard/budget-summary'),
          API.get('/dashboard/stats'),
        ]);
        setBudgetData(budgetRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Error fetching budget summary:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const fmt = (val) => {
    const n = Number(val) || 0;
    return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const pct = (actual, estimated) => {
    if (!estimated || estimated === 0) return 0;
    return Math.min(Math.round((actual / estimated) * 100), 100);
  };

  const barColor = (actual, estimated) => {
    if (!estimated || estimated === 0) return 'var(--text-muted)';
    const ratio = actual / estimated;
    if (ratio > 1) return 'var(--danger)';
    if (ratio > 0.85) return 'var(--warning)';
    return 'var(--success)';
  };

  if (loading) {
    return (
      <div className="ai-loading">
        <div className="spinner"></div>
        <p>Loading budget summary...</p>
      </div>
    );
  }

  const totalEstimated = budgetData?.total_estimated || 0;
  const totalActual = budgetData?.total_actual || 0;
  const remaining = totalEstimated - totalActual;
  const paidCount = budgetData?.paid_count || 0;
  const totalCount = budgetData?.total_count || 0;
  const paidPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  // Category breakdown
  const categoryBreakdown = budgetData?.categories || [];
  const sortedCategories = [...categoryBreakdown].sort(
    (a, b) => (b.estimated || 0) - (a.estimated || 0)
  );

  const statCards = [
    {
      label: 'Total Estimated',
      value: fmt(totalEstimated),
      icon: '📊',
      color: 'var(--primary)',
    },
    {
      label: 'Total Spent',
      value: fmt(totalActual),
      icon: '💸',
      color: totalActual > totalEstimated ? 'var(--danger)' : 'var(--secondary)',
    },
    {
      label: 'Remaining',
      value: fmt(remaining),
      icon: '💰',
      color: remaining >= 0 ? 'var(--success)' : 'var(--danger)',
    },
    {
      label: 'Paid Items',
      value: `${paidPct}%`,
      icon: '✅',
      color: 'var(--success)',
      subtitle: `${paidCount} of ${totalCount} items`,
    },
  ];

  return (
    <div>
      <div className="feature-page-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
          <h1>📊 Budget Summary</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/budget')}>
            View Full Budget
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 20,
        marginBottom: 32,
      }}>
        {statCards.map((card, i) => (
          <div key={i} style={{
            background: 'white',
            borderRadius: 'var(--radius)',
            padding: 24,
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: card.color,
            }} />
            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{card.icon}</div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
              marginBottom: 4,
            }}>
              {card.label}
            </div>
            <div style={{
              fontSize: '1.6rem',
              fontWeight: 700,
              color: card.color,
              fontFamily: "'Playfair Display', serif",
            }}>
              {card.value}
            </div>
            {card.subtitle && (
              <div style={{
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                marginTop: 4,
              }}>
                {card.subtitle}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Overall Progress */}
      {totalEstimated > 0 && (
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius)',
          padding: 24,
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--border)',
          marginBottom: 32,
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--primary)',
            marginBottom: 12,
          }}>
            Overall Budget Usage
          </div>
          <div style={{
            background: 'var(--bg)',
            borderRadius: 20,
            height: 28,
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              background: barColor(totalActual, totalEstimated),
              height: '100%',
              width: `${Math.min((totalActual / totalEstimated) * 100, 100)}%`,
              borderRadius: 20,
              transition: 'width 0.6s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 10,
              minWidth: 40,
            }}>
              <span style={{
                color: 'white',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}>
                {Math.round((totalActual / totalEstimated) * 100)}%
              </span>
            </div>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 8,
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
          }}>
            <span>{fmt(totalActual)} spent</span>
            <span>{fmt(totalEstimated)} budget</span>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {sortedCategories.length > 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius)',
          padding: 24,
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--border)',
          marginBottom: 32,
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--primary)',
            marginBottom: 20,
          }}>
            Category Breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sortedCategories.map((cat, i) => {
              const estimated = cat.estimated || 0;
              const actual = cat.actual || 0;
              const percentage = pct(actual, estimated);
              const color = barColor(actual, estimated);
              const isOver = actual > estimated;

              return (
                <div key={i}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 6,
                  }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      color: 'var(--text)',
                    }}>
                      {cat.category || 'Uncategorized'}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: isOver ? 'var(--danger)' : 'var(--text-light)',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'baseline',
                    }}>
                      <span style={{ fontWeight: 600 }}>{fmt(actual)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>/ {fmt(estimated)}</span>
                      {isOver && (
                        <span style={{
                          background: '#FFEBEE',
                          color: 'var(--danger)',
                          padding: '1px 8px',
                          borderRadius: 12,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}>
                          OVER
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--bg)',
                    borderRadius: 10,
                    height: 14,
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    {/* Estimated full bar (light) */}
                    <div style={{
                      background: color,
                      opacity: 0.2,
                      height: '100%',
                      width: '100%',
                      position: 'absolute',
                      borderRadius: 10,
                    }} />
                    {/* Actual bar */}
                    <div style={{
                      background: color,
                      height: '100%',
                      width: `${isOver ? 100 : percentage}%`,
                      borderRadius: 10,
                      transition: 'width 0.5s ease',
                      position: 'relative',
                      zIndex: 1,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-state-icon">💰</span>
          <h3>No budget data yet</h3>
          <p>Add items in the Budget Manager to see your summary here</p>
        </div>
      )}

      {/* Category List */}
      {sortedCategories.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--primary)',
            padding: '20px 24px 0 24px',
          }}>
            All Categories
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Estimated</th>
                <th>Actual</th>
                <th>Difference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map((cat, i) => {
                const estimated = cat.estimated || 0;
                const actual = cat.actual || 0;
                const diff = estimated - actual;
                const isOver = diff < 0;
                const isClose = !isOver && estimated > 0 && (actual / estimated) > 0.85;

                return (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600 }}>{cat.category || 'Uncategorized'}</td>
                    <td>{fmt(estimated)}</td>
                    <td>{fmt(actual)}</td>
                    <td style={{ color: isOver ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      {isOver ? '-' : '+'}{fmt(Math.abs(diff))}
                    </td>
                    <td>
                      <span className={`status-badge ${isOver ? 'status-declined' : isClose ? 'status-pending' : 'status-confirmed'}`}>
                        {isOver ? 'Over Budget' : isClose ? 'Almost There' : 'On Track'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BudgetSummary;
